"""FET matricule helpers.

A FET matricule looks like ``FE23A009``:

===========  ==========================================================
``FE``       Faculty of Engineering and Technology
``23``       year of admission, two digits
``A``        programme / department letter
``009``      sequence number within that year and programme
===========  ==========================================================
"""

import re

from django.utils import timezone

FACULTY_PREFIX = "FE"
SEQUENCE_WIDTH = 3

MATRICULE_RE = re.compile(
    rf"^{FACULTY_PREFIX}(?P<year>\d{{2}})(?P<letter>[A-Z])"
    rf"(?P<sequence>\d{{{SEQUENCE_WIDTH}}})$"
)


def build_matricule(year, letter="A", sequence=1):
    """Compose a matricule string, e.g. ``build_matricule(2023, "A", 9)`` -> ``FE23A009``."""
    return f"{FACULTY_PREFIX}{year % 100:02d}{str(letter).upper()}{int(sequence):0{SEQUENCE_WIDTH}d}"


def is_valid_matricule(value):
    """True when ``value`` already looks like a FET matricule."""
    return bool(value) and bool(MATRICULE_RE.match(str(value).strip().upper()))


def matricule_year(value, default=None):
    """Extract the two-digit admission year, or ``default`` when unparseable."""
    match = MATRICULE_RE.match(str(value or "").strip().upper())
    return int(match.group("year")) if match else default


def next_matricule(year=None, letter="A", queryset=None):
    """Return the next free matricule for ``year``/``letter``.

    Scans the existing sequence numbers and skips any that are taken, so it is
    safe to call repeatedly.
    """
    from apps.accounts.models import StudentProfile

    year = year or timezone.now().year
    yy = f"{year % 100:02d}"
    prefix = f"{FACULTY_PREFIX}{yy}{str(letter).upper()}"

    taken = set()
    source = queryset if queryset is not None else StudentProfile.objects.all()
    for existing in source.values_list("student_number", flat=True):
        if not existing:
            continue
        candidate = str(existing).strip().upper()
        if candidate.startswith(prefix) and is_valid_matricule(candidate):
            taken.add(int(candidate[len(prefix):]))

    sequence = 1
    while sequence in taken:
        sequence += 1
    return build_matricule(year, letter, sequence)
