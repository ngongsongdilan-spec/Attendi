"""Tests for mark-scale conversion and combined CA groups.

A lecturer may mark on any scale (e.g. /20, /25) while the assessment is
reported out of a different maximum (e.g. CA out of 30), and several
assessments may combine into one reported CA.
"""
import pytest
from decimal import Decimal

from apps.learning.models import Assessment, AssessmentGroup
from apps.learning.scales import group_grade, group_shares, is_converted, marking_scale, to_reported


class _FakeAssessment:
    def __init__(self, maximum_score, raw_maximum=None, group_weight=None, aid=1, title="x"):
        self.id = aid
        self.maximum_score = Decimal(str(maximum_score))
        self.raw_maximum = Decimal(str(raw_maximum)) if raw_maximum is not None else None
        self.group_weight = Decimal(str(group_weight)) if group_weight is not None else None
        self.title = title


class TestScaleConversion:
    def test_same_scale_is_a_no_op(self):
        a = _FakeAssessment(30)
        assert marking_scale(a) == Decimal("30")
        assert is_converted(a) is False
        assert to_reported(18, a) == Decimal("18.00")

    def test_raw_20_reported_30(self):
        a = _FakeAssessment(30, raw_maximum=20)
        assert marking_scale(a) == Decimal("20")
        assert is_converted(a) is True
        assert to_reported(18, a) == Decimal("27.00")
        assert to_reported(20, a) == Decimal("30.00")
        assert to_reported(10, a) == Decimal("15.00")

    def test_raw_25_reported_30(self):
        a = _FakeAssessment(30, raw_maximum=25)
        assert to_reported(25, a) == Decimal("30.00")
        assert to_reported(20, a) == Decimal("24.00")
        assert to_reported(0, a) == Decimal("0.00")

    def test_raw_40_reported_30_scales_down(self):
        a = _FakeAssessment(30, raw_maximum=40)
        assert to_reported(40, a) == Decimal("30.00")
        assert to_reported(20, a) == Decimal("15.00")

    def test_none_score_stays_none(self):
        assert to_reported(None, _FakeAssessment(30, raw_maximum=20)) is None

    def test_rounds_half_up_to_two_places(self):
        a = _FakeAssessment(30, raw_maximum=7)
        # 1/7 of 30 = 4.285714... -> 4.29
        assert to_reported(1, a) == Decimal("4.29")

    def test_invalid_raw_max_falls_back_to_reported(self):
        a = _FakeAssessment(30, raw_maximum=0)
        assert marking_scale(a) == Decimal("30")
        assert is_converted(a) is False


@pytest.mark.django_db
class TestGroupShares:
    def test_even_split_when_no_weights(self, offering):
        group = AssessmentGroup.objects.create(course_offering=offering, title="CA", maximum_score=30)
        a1 = Assessment.objects.create(course_offering=offering, title="CA1", maximum_score=10, group=group)
        a2 = Assessment.objects.create(course_offering=offering, title="CA2", maximum_score=10, group=group)
        a3 = Assessment.objects.create(course_offering=offering, title="CA3", maximum_score=10, group=group)
        shares = group_shares(group)
        assert shares[a1.id] == shares[a2.id] == shares[a3.id]
        assert abs(sum(shares.values()) - Decimal(1)) < Decimal("0.00001")

    def test_explicit_weights_are_normalised(self, offering):
        group = AssessmentGroup.objects.create(course_offering=offering, title="CA", maximum_score=30)
        a1 = Assessment.objects.create(course_offering=offering, title="CA1", maximum_score=10, group=group, group_weight=50)
        a2 = Assessment.objects.create(course_offering=offering, title="CA2", maximum_score=20, group=group, group_weight=50)
        shares = group_shares(group)
        assert shares[a1.id] == Decimal("0.5")
        assert shares[a2.id] == Decimal("0.5")

    def test_uneven_weights_normalise_to_one(self, offering):
        group = AssessmentGroup.objects.create(course_offering=offering, title="CA", maximum_score=30)
        a1 = Assessment.objects.create(course_offering=offering, title="CA1", maximum_score=10, group=group, group_weight=30)
        a2 = Assessment.objects.create(course_offering=offering, title="CA2", maximum_score=20, group=group, group_weight=10)
        shares = group_shares(group)
        assert shares[a1.id] == Decimal("0.75")
        assert shares[a2.id] == Decimal("0.25")
        assert sum(shares.values()) == Decimal(1)

    def test_mixed_weights_fall_back_to_even(self, offering):
        group = AssessmentGroup.objects.create(course_offering=offering, title="CA", maximum_score=30)
        a1 = Assessment.objects.create(course_offering=offering, title="CA1", maximum_score=10, group=group, group_weight=30)
        a2 = Assessment.objects.create(course_offering=offering, title="CA2", maximum_score=20, group=group)
        shares = group_shares(group)
        assert shares[a1.id] == shares[a2.id]


@pytest.mark.django_db
class TestGroupGrade:
    @staticmethod
    def _two_ca_group(offering):
        """CA1 marked on /20, CA2 marked on /25, combined into one CA out of 30."""
        group = AssessmentGroup.objects.create(course_offering=offering, title="CA", maximum_score=30)
        a1 = Assessment.objects.create(
            course_offering=offering, title="CA1", maximum_score=30, raw_maximum=20, group=group
        )
        a2 = Assessment.objects.create(
            course_offering=offering, title="CA2", maximum_score=30, raw_maximum=25, group=group
        )
        return group, a1, a2

    def test_different_scales_combine_fairly(self, offering):
        """16/20 and 20/25 are both 80%, so each earns 80% of its half of the 30."""
        group, a1, a2 = self._two_ca_group(offering)

        total, parts = group_grade({a1.id: Decimal("16"), a2.id: Decimal("20")}, group)
        by_id = {p["assessment_id"]: p for p in parts}
        # Each member keeps its own marking scale...
        assert by_id[a1.id]["marking_scale"] == Decimal("20.00")
        assert by_id[a2.id]["marking_scale"] == Decimal("25.00")
        # ...and both read as 24 out of their own reported 30.
        assert by_id[a1.id]["reported_score"] == Decimal("24.00")
        assert by_id[a2.id]["reported_score"] == Decimal("24.00")
        # Each carries half of the group 30, and 80% of that is earned.
        assert by_id[a1.id]["contributes_out_of"] == Decimal("15.00")
        assert by_id[a1.id]["points"] == Decimal("12.00")
        assert by_id[a2.id]["points"] == Decimal("12.00")
        assert total == Decimal("24.00")

    def test_perfect_on_both_gives_full_group_max(self, offering):
        group, a1, a2 = self._two_ca_group(offering)
        total, _ = group_grade({a1.id: Decimal("20"), a2.id: Decimal("25")}, group)
        assert total == Decimal("30.00")

    def test_missing_member_is_skipped_not_zeroed(self, offering):
        group = AssessmentGroup.objects.create(course_offering=offering, title="CA", maximum_score=30)
        a1 = Assessment.objects.create(course_offering=offering, title="CA1", maximum_score=30, group=group)
        a2 = Assessment.objects.create(course_offering=offering, title="CA2", maximum_score=30, group=group)
        total, _ = group_grade({a1.id: Decimal("30"), a2.id: None}, group)
        # Only CA1 counted, carrying half the group -> 15
        assert total == Decimal("15.00")

    def test_no_marks_gives_none(self, offering):
        group = AssessmentGroup.objects.create(course_offering=offering, title="CA", maximum_score=30)
        Assessment.objects.create(course_offering=offering, title="CA1", maximum_score=30, group=group)
        total, parts = group_grade({}, group)
        assert total is None
        assert parts[0]["points"] is None

    def test_weighted_group_respects_weights(self, offering):
        group = AssessmentGroup.objects.create(course_offering=offering, title="CA", maximum_score=30)
        a1 = Assessment.objects.create(
            course_offering=offering, title="Quiz", maximum_score=30, group=group, group_weight=70)
        a2 = Assessment.objects.create(
            course_offering=offering, title="Assignment", maximum_score=30, group=group, group_weight=30)
        total, parts = group_grade({a1.id: Decimal("30"), a2.id: Decimal("15")}, group)
        by_id = {p["assessment_id"]: p for p in parts}
        # 70/30 split: full marks on the 70% part, half marks on the 30% part.
        assert by_id[a1.id]["points"] == Decimal("21.00")
        assert by_id[a2.id]["points"] == Decimal("4.50")
        assert total == Decimal("25.50")
