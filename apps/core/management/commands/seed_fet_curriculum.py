"""Seed the FET curriculum for Electrical & Electronic Engineering (EEN) and
Civil & Architectural Engineering (CIV).

Source: curriculum dump (Department of Electrical and Electronic Engineering -
Telecommunications & Power Systems options; Department of Civil and
Architectural Engineering).

Idempotent: uses get_or_create throughout, so it can be re-run safely.
Course codes are unique institution-wide, so codes that already exist (e.g.
under CEN) are left untouched and only reported as skipped.

Usage:
    python manage.py seed_fet_curriculum [--dry-run]
"""
import uuid
from datetime import date

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.academics.models import Course, CourseOffering, Department, Semester

SEMESTERS = [
    ("2025/2026", "1", "2025/2026 Semester 1", date(2025, 10, 6), date(2026, 2, 6)),
    ("2025/2026", "2", "2025/2026 Semester 2", date(2026, 2, 16), date(2026, 6, 26)),
    # ("2026/2027", "1") already exists in prod and is the active semester.
    ("2026/2027", "1", None, None, None),
    ("2026/2027", "2", "2026/2027 Semester 2", date(2027, 2, 15), date(2027, 6, 25)),
]

# Each section: department code, level, academic year, semester number, courses.
# Course tuple = (code, title, credit_units, course_type)  where course_type is
# "C" (compulsory) or "UC" (university/common).
SECTIONS = [
    # ------------------------------------------------------------------ EEN
    # Telecommunications
    {"dept": "EEN", "level": "200", "year": "2026/2027", "number": "1", "courses": [
        ("CEF201", "Analysis", 4, "C"),
        ("CEF203", "Linear Algebra", 4, "C"),
        ("CEF207", "Programming I", 4, "C"),
        ("EEF261", "Circuit Analysis", 4, "C"),
        ("EEF263", "Digital Electronics I", 4, "C"),
        ("EEF267", "Fundamentals of Electrical Engineering", 4, "C"),
        ("EEF269", "Physics for Engineering I", 4, "C"),
        ("FET201", "Professional and Technical Communication", 3, "C"),
        ("ENG100", "Use of English", 2, "UC"),
        ("ICT100", "Computer for Business", 2, "UC"),
    ]},
    {"dept": "EEN", "level": "200", "year": "2026/2027", "number": "2", "courses": [
        ("CEF250", "Computer Architecture", 4, "C"),
        ("EEF260", "Analogue Electronics I", 4, "C"),
        ("EEF262", "Physics for Engineering II", 4, "C"),
        ("EEF264", "Control Engineering Instrumentation", 4, "C"),
        ("EEF268", "Digital Electronics II", 4, "C"),
        ("EEF270", "Mathematics for Engineering", 3, "C"),
        ("EEF272", "Discrete Mathematics", 3, "C"),
        ("EEF274", "Object-Oriented Programming with Python and C++", 4, "C"),
        ("FRE100", "Functional French", 2, "UC"),
        ("CEE100", "Civics and Ethics Education", 2, "UC"),
        ("SPT100", "Sports", 2, "UC"),
    ]},
    {"dept": "EEN", "level": "300", "year": "2026/2027", "number": "1", "courses": [
        ("CEF347", "Operating Systems", 3, "C"),
        ("EEF333", "Introduction to Renewable Energy", 3, "C"),
        ("EEF349", "Fundamentals of Electrical Machines", 4, "C"),
        ("EEF361", "Electronic Measurements", 3, "C"),
        ("EEF363", "Analog Electronics II", 4, "C"),
        ("EEF365", "Microcontrollers and Microprocessors", 3, "C"),
        ("EEF367", "Digital Electronic Laboratory", 4, "C"),
        ("FET301", "Probability and Statistics", 3, "C"),
        ("LAW100", "Legal Aspects for Business", 2, "C"),
    ]},
    {"dept": "EEN", "level": "300", "year": "2026/2027", "number": "2", "courses": [
        ("CEF364", "Local Area Computer Networks", 3, "C"),
        ("EEF360", "Systems Simulation and PCB Design Techniques", 3, "C"),
        ("EEF362", "Analog Electronic Lab", 4, "C"),
        ("EEF364", "Basic Telecommunications", 3, "C"),
        ("EEF366", "Sequence Control", 3, "C"),
        ("EEF368", "Microcontroller and Microprocessors Lab", 3, "C"),
        ("EEF370", "Fundamentals of Electrical Machines & Renewable Energy Components Lab", 4, "C"),
        ("ENT100", "Entrepreneurship", 2, "UC"),
    ]},
    {"dept": "EEN", "level": "400", "year": "2026/2027", "number": "1", "courses": [
        ("CEF453", "Networks Design and Simulation (Packet Tracer, NS2, JSIM)", 3, "C"),
        ("CEF479", "Computer Networks Laboratory", 3, "C"),
        ("EEF445", "Sensor Networks", 3, "C"),
        ("EEF461", "Radio and Television", 3, "C"),
        ("EEF463", "Optical Network Communication", 3, "C"),
        ("EEF465", "Transmissions Systems", 3, "C"),
        ("EEF467", "Feedback Systems", 3, "C"),
        ("EEF469", "Microelectronics", 3, "C"),
        ("EEF471", "Basic Telecommunication Laboratory", 4, "C"),
    ]},
    {"dept": "EEN", "level": "400", "year": "2026/2027", "number": "2", "courses": [
        ("CEF468", "Database and PHP Programming", 3, "C"),
        ("EEF460", "Feedback Systems Laboratory", 4, "C"),
        ("EEF462", "Digital Signal Processing", 3, "C"),
        ("EEF464", "Wireless and Mobile Communications", 4, "C"),
        ("EEF466", "Antenna and Propagation", 3, "C"),
        ("EEF470", "Optical Network Communication Lab", 3, "C"),
        ("EEF474", "Coding Theory", 3, "C"),
        ("EEF476", "Analogue Electronic Laboratory II", 4, "C"),
        ("EEF478", "Radio and Television Laboratory", 4, "C"),
    ]},
    {"dept": "EEN", "level": "500", "year": "2026/2027", "number": "1", "courses": [
        ("EEF599", "Internship", 30, "C"),
    ]},
    {"dept": "EEN", "level": "500", "year": "2026/2027", "number": "2", "courses": [
        ("FET596", "Entrepreneurship Project", 12, "C"),
        ("FET598", "Final Year Project", 18, "C"),
    ]},
    # Power Systems
    {"dept": "EEN", "level": "400", "year": "2025/2026", "number": "1", "courses": [
        ("EEF467", "Feedback Systems", 3, "C"),
        ("EEF469", "Microelectronics", 3, "C"),
        ("EEF481", "Electric Machines I", 4, "C"),
        ("EEF483", "Power Electronics and Control", 3, "C"),
        ("EEF485", "Sequence Control Lab", 4, "C"),
        ("EEF487", "Electrical Power Systems Engineering I", 4, "C"),
        ("EEF489", "Electrical Installations", 3, "C"),
        ("EEF491", "Renewable Energy Components and Technologies", 3, "C"),
        ("EEF493", "Electrical Transmission Lines", 3, "C"),
    ]},
    {"dept": "EEN", "level": "400", "year": "2025/2026", "number": "2", "courses": [
        ("EEF460", "Feedback Systems Laboratory", 4, "C"),
        ("EEF476", "Analogue Electronic Laboratory II", 4, "C"),
        ("EEF480", "Control of Electrical Machines", 4, "C"),
        ("EEF482", "Electric Machines II", 4, "C"),
        ("EEF484", "Electrical Power Systems Engineering II", 4, "C"),
        ("EEF486", "Electrical Machines Laboratory", 4, "C"),
        ("EEF488", "Renewable Energy Components and Technologies Lab", 4, "C"),
        ("EEF490", "Hybrid Energy Components and Systems", 4, "C"),
    ]},
    {"dept": "EEN", "level": "500", "year": "2025/2026", "number": "1", "courses": [
        ("EEF467", "Feedback Systems", 3, "C"),
        ("EEF469", "Microelectronics", 3, "C"),
        ("EEF481", "Electric Machines I", 4, "C"),
        ("EEF483", "Power Electronics and Control", 3, "C"),
        ("EEF485", "Sequence Control Lab", 4, "C"),
        ("EEF487", "Electrical Power Systems Engineering I", 4, "C"),
        ("EEF489", "Electrical Installations", 3, "C"),
        ("EEF491", "Renewable Energy Components and Technologies", 3, "C"),
        ("EEF493", "Electrical Transmission Lines", 3, "C"),
    ]},
    {"dept": "EEN", "level": "500", "year": "2025/2026", "number": "2", "courses": [
        ("EEF480", "Control of Electrical Machines", 4, "C"),
        ("EEF482", "Electric Machines II", 4, "C"),
        ("EEF484", "Electrical Power Systems Engineering II", 4, "C"),
        ("EEF490", "Hybrid Energy Components and Systems", 4, "C"),
        ("FET598", "Final Year Project", 18, "C"),
    ]},
    # ------------------------------------------------------------------ CIV
    {"dept": "CIV", "level": "300", "year": "2025/2026", "number": "1", "courses": [
        ("CIV315", "Civil Engineering Materials (Construction Materials)", 4, "C"),
        ("CIV321", "Computer Aided Drawing I (CAD I)", 4, "C"),
        ("CIV335", "Introduction to Urbanism and Transport", 4, "C"),
        ("CIV337", "Building Design Architecture and Technology", 4, "C"),
        ("CIV341", "Differential Equations", 4, "C"),
        ("CIV343", "General Topography and Surveying", 4, "C"),
        ("CIV345", "Engineering Geology and Applied Hydrology", 4, "C"),
        ("FET301", "Probability and Statistics", 3, "C"),
    ]},
    {"dept": "CIV", "level": "300", "year": "2025/2026", "number": "2", "courses": [
        ("CIV310", "Thermodynamics", 4, "C"),
        ("CIV318", "Building Services", 4, "C"),
        ("CIV324", "Health, Safety, Security and Environment (HSSE)", 4, "C"),
        ("CIV334", "Strength of Materials", 4, "C"),
        ("CIV340", "Technical Writing", 2, "C"),
        ("CIV342", "Architectural Drawing", 4, "C"),
        ("CIV344", "Solid Mechanics", 4, "C"),
        ("CIV346", "Soil Mechanics", 4, "C"),
        ("CIV348", "Road and Various Networks", 2, "C"),
    ]},
    {"dept": "CIV", "level": "400", "year": "2025/2026", "number": "1", "courses": [
        ("CIV411", "Acoustic and Thermal Comfort in buildings", 4, "C"),
        ("CIV417", "Communication Techniques", 2, "C"),
        ("CIV421", "Structural Analysis 1: Determinate Structure", 4, "C"),
        ("CIV423", "Soil Mechanics", 4, "C"),
        ("CIV425", "Quantity Surveying, Work Planning and Tendering", 4, "C"),
        ("CIV427", "Roads and Diverse Networks (RDN)", 4, "C"),
        ("CIV429", "Steel and Timber Construction", 4, "C"),
        ("CIV431", "Public Contract and Regulation", 3, "C"),
        ("CIV433", "Workshop Practices", 6, "C"),
    ]},
    {"dept": "CIV", "level": "400", "year": "2025/2026", "number": "2", "courses": [
        ("CIV402", "Reinforced Concrete 1", 4, "C"),
        ("CIV404", "Fluids Mechanics and Hydraulic Constructions", 4, "C"),
        ("CIV408", "Geotechnics Lab 1", 4, "C"),
        ("CIV410", "Fundamentals of Building Information Management (BIM)", 4, "C"),
        ("CIV416", "Introduction to Urbanism and Transport", 4, "C"),
        ("CIV418", "Quality, Safety and Environmental Management", 4, "C"),
        ("CIV422", "Structural Analysis 2: Indeterminate Structure", 4, "C"),
        ("CIV426", "Structural Design", 4, "C"),
    ]},
    {"dept": "CIV", "level": "500", "year": "2025/2026", "number": "1", "courses": [
        ("CIV501", "Internship", 36, "C"),
    ]},
    {"dept": "CIV", "level": "500", "year": "2025/2026", "number": "2", "courses": [
        ("CIV598", "Final Year Project", 18, "C"),
        ("CIV502", "Reinforced Concrete 2", 4, "C"),
        ("CIV504", "Structural Analysis and Design", 4, "C"),
        ("CIV506", "Geotechnics Lab 2", 4, "C"),
    ]},
    {"dept": "CIV", "level": "600", "year": "2025/2026", "number": "1", "courses": [
        ("CIV621", "Construction Project and Design Optimization", 4, "C"),
        ("CIV623", "Dynamics and Earthquake Engineering", 4, "C"),
        ("CIV627", "Bridges Engineering and Advanced Soil Mechanics", 4, "C"),
        ("CIV631", "Quantity Surveying, Building Contract and Tendering", 4, "C"),
        ("CIV633", "Pre-Stressed Concrete", 4, "C"),
        ("CIV635", "Water Resources Planning and Management", 4, "C"),
        ("CIV637", "Composite Construction", 4, "C"),
        ("CIV639", "Numerical Analysis (Finite Elements Methods)", 4, "C"),
        ("CIV641", "Steel and Timber Construction", 4, "C"),
    ]},
    {"dept": "CIV", "level": "600", "year": "2025/2026", "number": "2", "courses": [
        ("CIV642", "Labour Law", 2, "C"),
        ("ENT600", "Entrepreneurship", 6, "UC"),
        ("CIV690", "Seminar Series", 4, "C"),
        ("CIV628", "Professional MEng. Dissertation", 24, "C"),
    ]},
]


class Command(BaseCommand):
    help = "Seed EEN/CIV courses, semesters and offerings from the FET curriculum."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report changes without writing to the database.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Build the catalog and the offering list in memory first. For a code
        # that appears in several sections, the first occurrence wins (so the
        # Power L500 top-up reuses the L400 definitions).
        course_defs = {}
        offering_keys = []  # (code, dept_code, (year, number))
        seen_offering = set()
        for section in SECTIONS:
            dept_code = section["dept"]
            semkey = (section["year"], section["number"])
            for code, title, credits, ctype in section["courses"]:
                if code not in course_defs:
                    course_defs[code] = (dept_code, section["level"], title, credits, ctype)
                okey = (code, semkey)
                if okey not in seen_offering:
                    seen_offering.add(okey)
                    offering_keys.append((code, dept_code, semkey))

        stats = {
            "semesters_created": 0,
            "courses_created": 0,
            "courses_skipped": [],
            "offerings_created": 0,
            "offerings_existing": 0,
        }

        try:
            with transaction.atomic():
                departments = {d.code: d for d in Department.objects.all()}

                # --- Semesters (few rows: create individually) --------------
                semesters = {(s.academic_year, s.number): s for s in Semester.objects.all()}
                for year, number, name, start, end in SEMESTERS:
                    if (year, number) in semesters:
                        continue
                    sem = Semester.objects.create(
                        name=name,
                        academic_year=year,
                        number=number,
                        start_date=start,
                        end_date=end,
                        status="ACTIVE",
                        is_active=False,
                    )
                    semesters[(year, number)] = sem
                    stats["semesters_created"] += 1

                # --- Courses (batch) --------------------------------------
                existing_codes = set(Course.objects.values_list("code", flat=True))
                stats["courses_skipped"] = sorted(c for c in course_defs if c in existing_codes)

                new_courses = [
                    Course(
                        id=uuid.uuid4(),
                        department=departments[dept_code],
                        code=code,
                        title=title,
                        description=f"Course type: {ctype}",
                        credit_units=credits,
                        level=level,
                        status="ACTIVE",
                    )
                    for code, (dept_code, level, title, credits, ctype) in course_defs.items()
                    if code not in existing_codes
                ]
                Course.objects.bulk_create(new_courses, batch_size=200)
                stats["courses_created"] = len(new_courses)

                # --- Offerings (batch) ------------------------------------
                codes_needed = {c for c, _, _ in offering_keys}
                code_to_course = {c.code: c for c in Course.objects.filter(code__in=codes_needed)}
                existing_offerings = set(CourseOffering.objects.values_list("course_id", "semester_id"))

                new_offerings = []
                for code, dept_code, semkey in offering_keys:
                    course = code_to_course[code]
                    semester = semesters[semkey]
                    if (course.id, semester.id) in existing_offerings:
                        stats["offerings_existing"] += 1
                        continue
                    new_offerings.append(CourseOffering(
                        id=uuid.uuid4(),
                        course=course,
                        semester=semester,
                        department=departments[dept_code],
                        status="ACTIVE",
                    ))
                CourseOffering.objects.bulk_create(new_offerings, batch_size=200)
                stats["offerings_created"] = len(new_offerings)

                if dry_run:
                    transaction.set_rollback(True)
        except Exception as exc:  # noqa: BLE001 - surface the cause to the operator
            self.stderr.write(self.style.ERROR(f"Seeding failed: {exc}"))
            raise

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}semesters created: {stats['semesters_created']} | "
            f"courses created: {stats['courses_created']} | "
            f"courses skipped (already existed): {len(stats['courses_skipped'])} | "
            f"offerings created: {stats['offerings_created']} | "
            f"offerings already present: {stats['offerings_existing']}"
        ))
        if stats["courses_skipped"]:
            self.stdout.write("Skipped existing codes: " + ", ".join(stats["courses_skipped"]))
