import pytest

from apps.accounts.matricule import (
    build_matricule,
    is_valid_matricule,
    matricule_year,
    next_matricule,
)


class TestBuildMatricule:
    def test_matches_the_fet_example(self):
        assert build_matricule(2023, "A", 9) == "FE23A009"

    def test_pads_the_sequence_to_three_digits(self):
        assert build_matricule(2023, "A", 1) == "FE23A001"
        assert build_matricule(2023, "A", 42) == "FE23A042"
        assert build_matricule(2023, "A", 999) == "FE23A999"

    def test_two_digit_year_wraps(self):
        assert build_matricule(2024, "A", 1) == "FE24A001"
        assert build_matricule(2009, "A", 1) == "FE09A001"

    def test_letter_is_upper_cased(self):
        assert build_matricule(2023, "b", 5) == "FE23B005"


class TestIsValidMatricule:
    @pytest.mark.parametrize(
        "value",
        ["FE23A009", "FE23A001", "FE09A123", "FE24B100"],
    )
    def test_accepts_real_format(self, value):
        assert is_valid_matricule(value) is True

    @pytest.mark.parametrize(
        "value",
        [
            "JOHNDOE",          # old email-derived seed value
            "FET23CS101",       # old hand-written test value
            "STU001",
            "FE23A09",          # sequence too short
            "FE23A0091",        # sequence too long
            "FE23AB009",        # two letters
            "XX23A009",         # wrong faculty prefix
            "FE23009",          # missing letter
            "",
            None,
        ],
    )
    def test_rejects_everything_else(self, value):
        assert is_valid_matricule(value) is False

    def test_is_case_insensitive_and_trims(self):
        assert is_valid_matricule("  fe23a009 ") is True


class TestMatriculeYear:
    def test_reads_the_admission_year(self):
        assert matricule_year("FE23A009") == 23
        assert matricule_year("FE09A123") == 9

    def test_returns_default_for_junk(self):
        assert matricule_year("JOHNDOE") is None
        assert matricule_year("JOHNDOE", default=0) == 0


@pytest.mark.django_db
class TestNextMatricule:
    def test_first_matricule_when_none_exist(self):
        from apps.accounts.models import StudentProfile

        assert next_matricule(2023, "A") == "FE23A001"

    def test_skips_numbers_already_taken(self):
        from apps.accounts.models import StudentProfile, User

        for seq in (1, 2):
            u = User.objects.create_user(
                email=f"taken{seq}@student.fet.edu", password="x",
                first_name="T", last_name=str(seq), role="STUDENT",
            )
            StudentProfile.objects.create(
                user=u, student_number=build_matricule(2023, "A", seq),
                department=None, level="300",
            )

        assert next_matricule(2023, "A") == "FE23A003"

    def test_ignores_other_years_and_letters(self):
        from apps.accounts.models import StudentProfile, User

        for email, number in [
            ("y24@student.fet.edu", build_matricule(2024, "A", 1)),
            ("y23b@student.fet.edu", build_matricule(2023, "B", 1)),
        ]:
            u = User.objects.create_user(
                email=email, password="x", first_name="Y",
                last_name="Z", role="STUDENT",
            )
            StudentProfile.objects.create(
                user=u, student_number=number, department=None, level="300",
            )

        # Neither FE24A001 nor FE23B001 blocks FE23A001.
        assert next_matricule(2023, "A") == "FE23A001"

    def test_does_not_collide_with_legacy_values(self):
        from apps.accounts.models import StudentProfile, User

        u = User.objects.create_user(
            email="legacy@student.fet.edu", password="x",
            first_name="L", last_name="G", role="STUDENT",
        )
        StudentProfile.objects.create(
            user=u, student_number="JOHNDOE", department=None, level="300",
        )

        assert next_matricule(2023, "A") == "FE23A001"


@pytest.mark.django_db
class TestSeededDemoMatricules:
    def test_demo_students_get_fet_matricules(self):
        from django.core.management import call_command

        from apps.accounts.models import StudentProfile

        call_command("seed_demo", verbosity=0, force=True)

        numbers = set(
            StudentProfile.objects.filter(
                user__email__endswith="@student.fet.edu"
            ).values_list("student_number", flat=True)
        )
        assert numbers, "seeder produced no students"
        for number in numbers:
            assert is_valid_matricule(number), f"{number} is not a FET matricule"

    def test_reseeding_is_idempotent(self):
        from django.core.management import call_command

        from apps.accounts.models import StudentProfile

        # force=True: the seeder refuses to run with DEBUG=False, and pytest
        # runs with DEBUG off. These are throwaway test databases.
        call_command("seed_demo", verbosity=0, force=True)
        first = sorted(
            StudentProfile.objects.filter(
                user__email__endswith="@student.fet.edu"
            ).values_list("student_number", flat=True)
        )

        call_command("seed_demo", verbosity=0, force=True)
        second = sorted(
            StudentProfile.objects.filter(
                user__email__endswith="@student.fet.edu"
            ).values_list("student_number", flat=True)
        )

        assert first == second
        assert len(set(first)) == len(first), "duplicate matricules generated"
