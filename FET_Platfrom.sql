--
-- PostgreSQL database dump
--

\restrict hOKsVJ6eJM4OXKavaPET6IZTtfJc4ueClDHBR6OOxgfUwn2yFCgcHyaI6R8hxrn

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-09-07 20:44:58

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 18436)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 5388 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 238 (class 1259 OID 26966)
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_offering_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 27085)
-- Name: assessment_components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    maximum_score numeric(10,2) NOT NULL,
    weight numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_assessment_component_maximum_score CHECK ((maximum_score > (0)::numeric)),
    CONSTRAINT chk_assessment_component_weight CHECK (((weight >= (0)::numeric) AND (weight <= (100)::numeric)))
);


ALTER TABLE public.assessment_components OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 27109)
-- Name: assessment_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_component_id uuid NOT NULL,
    student_id uuid NOT NULL,
    assessor_id uuid NOT NULL,
    score numeric(10,2) NOT NULL,
    feedback text,
    status character varying(20) DEFAULT 'ASSESSED'::character varying NOT NULL,
    assessed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_assessment_record_score CHECK ((score >= (0)::numeric)),
    CONSTRAINT chk_assessment_record_status CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ASSESSED'::character varying, 'REVIEWED'::character varying])::text[])))
);


ALTER TABLE public.assessment_records OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 26880)
-- Name: attendance_checkpoints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attendance_session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    checkpoint_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_attendance_checkpoint_number CHECK ((checkpoint_number > 0))
);


ALTER TABLE public.attendance_checkpoints OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 26907)
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attendance_session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status character varying(20) DEFAULT 'PRESENT'::character varying NOT NULL,
    checked_in_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_attendance_record_status CHECK (((status)::text = ANY ((ARRAY['PRESENT'::character varying, 'LATE'::character varying, 'ABSENT'::character varying, 'EXCUSED'::character varying])::text[])))
);


ALTER TABLE public.attendance_records OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 26851)
-- Name: attendance_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_session_id uuid NOT NULL,
    session_date date NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    CONSTRAINT chk_attendance_session_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'EXPIRED'::character varying, 'CLOSED'::character varying])::text[]))),
    CONSTRAINT chk_attendance_session_times CHECK (((ended_at IS NULL) OR (ended_at >= started_at)))
);


ALTER TABLE public.attendance_sessions OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 27304)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    resource_type character varying(100),
    resource_id uuid,
    metadata jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 26807)
-- Name: class_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_offering_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    room character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.class_definitions OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 26827)
-- Name: class_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_definition_id uuid NOT NULL,
    day_of_week character varying(10) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    room character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_class_session_day CHECK (((day_of_week)::text = ANY ((ARRAY['MONDAY'::character varying, 'TUESDAY'::character varying, 'WEDNESDAY'::character varying, 'THURSDAY'::character varying, 'FRIDAY'::character varying, 'SATURDAY'::character varying, 'SUNDAY'::character varying])::text[]))),
    CONSTRAINT chk_class_session_time CHECK ((end_time > start_time))
);


ALTER TABLE public.class_sessions OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 26779)
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_offering_id uuid NOT NULL,
    enrollment_status character varying(20) DEFAULT 'ENROLLED'::character varying NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_enrollment_status CHECK (((enrollment_status)::text = ANY ((ARRAY['ENROLLED'::character varying, 'DROPPED'::character varying, 'COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.course_enrollments OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 26749)
-- Name: course_offerings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    semester_id uuid NOT NULL,
    lecturer_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.course_offerings OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 26708)
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    credits numeric(4,1),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_course_credits CHECK (((credits IS NULL) OR (credits > (0)::numeric)))
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 26627)
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    faculty_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 18549)
-- Name: faculties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.faculties OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 27149)
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by uuid NOT NULL,
    original_name character varying(255) NOT NULL,
    storage_key character varying(500) NOT NULL,
    mime_type character varying(100),
    size_bytes bigint,
    checksum character varying(255),
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_files_size CHECK (((size_bytes IS NULL) OR (size_bytes >= 0))),
    CONSTRAINT chk_files_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'DELETED'::character varying, 'PROCESSING'::character varying, 'FAILED'::character varying])::text[])))
);


ALTER TABLE public.files OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 26937)
-- Name: learning_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.learning_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_offering_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    material_type character varying(30) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    file_id uuid,
    CONSTRAINT chk_learning_material_type CHECK (((material_type)::text = ANY ((ARRAY['DOCUMENT'::character varying, 'VIDEO'::character varying, 'AUDIO'::character varying, 'PRESENTATION'::character varying, 'IMAGE'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.learning_materials OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 26680)
-- Name: lecturer_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lecturer_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    staff_number character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lecturer_profiles OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 27284)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    reference_type character varying(50),
    reference_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 18488)
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 27254)
-- Name: project_contributions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    student_id uuid NOT NULL,
    task_id uuid,
    description text NOT NULL,
    contribution_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_contributions OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 27179)
-- Name: project_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    file_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_documents OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 27227)
-- Name: project_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_group_members (
    group_id uuid NOT NULL,
    student_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_group_members OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 27207)
-- Name: project_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_groups OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 27028)
-- Name: project_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    student_id uuid NOT NULL,
    role character varying(20) DEFAULT 'MEMBER'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_project_member_role CHECK (((role)::text = ANY ((ARRAY['MEMBER'::character varying, 'GROUP_LEADER'::character varying])::text[])))
);


ALTER TABLE public.project_members OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 27056)
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'TODO'::character varying NOT NULL,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    group_id uuid,
    priority character varying(20) DEFAULT 'MEDIUM'::character varying NOT NULL,
    CONSTRAINT chk_project_task_priority CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying])::text[]))),
    CONSTRAINT chk_project_task_status CHECK (((status)::text = ANY ((ARRAY['TODO'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.project_tasks OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 26993)
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_offering_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    start_date date,
    due_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_project_dates CHECK (((due_date IS NULL) OR (start_date IS NULL) OR (due_date >= start_date))),
    CONSTRAINT chk_project_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'COMPLETED'::character varying, 'ARCHIVED'::character varying])::text[])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 18502)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 18474)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 26732)
-- Name: semesters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.semesters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    academic_year character varying(20) NOT NULL,
    name character varying(30) NOT NULL,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_semester_dates CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date))),
    CONSTRAINT chk_semester_name CHECK (((name)::text = ANY ((ARRAY['SEMESTER 1'::character varying, 'SEMESTER 2'::character varying])::text[])))
);


ALTER TABLE public.semesters OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 26652)
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    student_number character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.student_profiles OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 18521)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role_id uuid NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_users_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'SUSPENDED'::character varying, 'DEACTIVATED'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5370 (class 0 OID 26966)
-- Dependencies: 238
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, course_offering_id, created_by, title, content, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5374 (class 0 OID 27085)
-- Dependencies: 242
-- Data for Name: assessment_components; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_components (id, project_id, name, description, maximum_score, weight, created_at) FROM stdin;
\.


--
-- TOC entry 5375 (class 0 OID 27109)
-- Dependencies: 243
-- Data for Name: assessment_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assessment_records (id, assessment_component_id, student_id, assessor_id, score, feedback, status, assessed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5367 (class 0 OID 26880)
-- Dependencies: 235
-- Data for Name: attendance_checkpoints; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_checkpoints (id, attendance_session_id, student_id, checkpoint_number, created_at) FROM stdin;
\.


--
-- TOC entry 5368 (class 0 OID 26907)
-- Dependencies: 236
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_records (id, attendance_session_id, student_id, status, checked_in_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5366 (class 0 OID 26851)
-- Dependencies: 234
-- Data for Name: attendance_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_sessions (id, class_session_id, session_date, started_at, ended_at, status, created_at, expires_at) FROM stdin;
\.


--
-- TOC entry 5382 (class 0 OID 27304)
-- Dependencies: 250
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, actor_user_id, action, resource_type, resource_id, metadata, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- TOC entry 5364 (class 0 OID 26807)
-- Dependencies: 232
-- Data for Name: class_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_definitions (id, course_offering_id, name, room, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5365 (class 0 OID 26827)
-- Dependencies: 233
-- Data for Name: class_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_sessions (id, class_definition_id, day_of_week, start_time, end_time, room, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5363 (class 0 OID 26779)
-- Dependencies: 231
-- Data for Name: course_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_enrollments (id, student_id, course_offering_id, enrollment_status, enrolled_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5362 (class 0 OID 26749)
-- Dependencies: 230
-- Data for Name: course_offerings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_offerings (id, course_id, semester_id, lecturer_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5360 (class 0 OID 26708)
-- Dependencies: 228
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, department_id, code, name, description, credits, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5357 (class 0 OID 26627)
-- Dependencies: 225
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, faculty_id, name, code, description, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5356 (class 0 OID 18549)
-- Dependencies: 224
-- Data for Name: faculties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculties (id, name, code, description, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5376 (class 0 OID 27149)
-- Dependencies: 244
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.files (id, uploaded_by, original_name, storage_key, mime_type, size_bytes, checksum, status, created_at) FROM stdin;
\.


--
-- TOC entry 5369 (class 0 OID 26937)
-- Dependencies: 237
-- Data for Name: learning_materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.learning_materials (id, course_offering_id, created_by, title, description, material_type, created_at, updated_at, file_id) FROM stdin;
\.


--
-- TOC entry 5359 (class 0 OID 26680)
-- Dependencies: 227
-- Data for Name: lecturer_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lecturer_profiles (id, user_id, department_id, staff_number, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5381 (class 0 OID 27284)
-- Dependencies: 249
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, message, reference_type, reference_id, read_at, created_at) FROM stdin;
\.


--
-- TOC entry 5353 (class 0 OID 18488)
-- Dependencies: 221
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name, description, created_at) FROM stdin;
\.


--
-- TOC entry 5380 (class 0 OID 27254)
-- Dependencies: 248
-- Data for Name: project_contributions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_contributions (id, project_id, student_id, task_id, description, contribution_type, created_at) FROM stdin;
\.


--
-- TOC entry 5377 (class 0 OID 27179)
-- Dependencies: 245
-- Data for Name: project_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_documents (id, project_id, uploaded_by, file_id, document_type, created_at) FROM stdin;
\.


--
-- TOC entry 5379 (class 0 OID 27227)
-- Dependencies: 247
-- Data for Name: project_group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_group_members (group_id, student_id, joined_at) FROM stdin;
\.


--
-- TOC entry 5378 (class 0 OID 27207)
-- Dependencies: 246
-- Data for Name: project_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_groups (id, project_id, name, description, created_at) FROM stdin;
\.


--
-- TOC entry 5372 (class 0 OID 27028)
-- Dependencies: 240
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_members (id, project_id, student_id, role, joined_at) FROM stdin;
\.


--
-- TOC entry 5373 (class 0 OID 27056)
-- Dependencies: 241
-- Data for Name: project_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_tasks (id, project_id, created_by, title, description, status, due_date, created_at, updated_at, group_id, priority) FROM stdin;
\.


--
-- TOC entry 5371 (class 0 OID 26993)
-- Dependencies: 239
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (id, course_offering_id, created_by, title, description, status, start_date, due_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5354 (class 0 OID 18502)
-- Dependencies: 222
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id, created_at) FROM stdin;
\.


--
-- TOC entry 5352 (class 0 OID 18474)
-- Dependencies: 220
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, created_at) FROM stdin;
\.


--
-- TOC entry 5361 (class 0 OID 26732)
-- Dependencies: 229
-- Data for Name: semesters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.semesters (id, academic_year, name, start_date, end_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5358 (class 0 OID 26652)
-- Dependencies: 226
-- Data for Name: student_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_profiles (id, user_id, department_id, student_number, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5355 (class 0 OID 18521)
-- Dependencies: 223
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, first_name, last_name, role_id, status, last_login_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5114 (class 2606 OID 26982)
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- TOC entry 5127 (class 2606 OID 27101)
-- Name: assessment_components assessment_components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_components
    ADD CONSTRAINT assessment_components_pkey PRIMARY KEY (id);


--
-- TOC entry 5131 (class 2606 OID 27131)
-- Name: assessment_records assessment_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_records
    ADD CONSTRAINT assessment_records_pkey PRIMARY KEY (id);


--
-- TOC entry 5100 (class 2606 OID 26892)
-- Name: attendance_checkpoints attendance_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_checkpoints
    ADD CONSTRAINT attendance_checkpoints_pkey PRIMARY KEY (id);


--
-- TOC entry 5106 (class 2606 OID 26924)
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- TOC entry 5094 (class 2606 OID 26869)
-- Name: attendance_sessions attendance_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5153 (class 2606 OID 27316)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5085 (class 2606 OID 26819)
-- Name: class_definitions class_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_definitions
    ADD CONSTRAINT class_definitions_pkey PRIMARY KEY (id);


--
-- TOC entry 5089 (class 2606 OID 26843)
-- Name: class_sessions class_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5079 (class 2606 OID 26794)
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- TOC entry 5075 (class 2606 OID 26761)
-- Name: course_offerings course_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT course_offerings_pkey PRIMARY KEY (id);


--
-- TOC entry 5066 (class 2606 OID 26724)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- TOC entry 5047 (class 2606 OID 26642)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5041 (class 2606 OID 18567)
-- Name: faculties faculties_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculties
    ADD CONSTRAINT faculties_code_key UNIQUE (code);


--
-- TOC entry 5043 (class 2606 OID 18565)
-- Name: faculties faculties_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculties
    ADD CONSTRAINT faculties_name_key UNIQUE (name);


--
-- TOC entry 5045 (class 2606 OID 18563)
-- Name: faculties faculties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculties
    ADD CONSTRAINT faculties_pkey PRIMARY KEY (id);


--
-- TOC entry 5135 (class 2606 OID 27166)
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- TOC entry 5112 (class 2606 OID 26955)
-- Name: learning_materials learning_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_materials
    ADD CONSTRAINT learning_materials_pkey PRIMARY KEY (id);


--
-- TOC entry 5060 (class 2606 OID 26693)
-- Name: lecturer_profiles lecturer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT lecturer_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5062 (class 2606 OID 26697)
-- Name: lecturer_profiles lecturer_profiles_staff_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT lecturer_profiles_staff_number_key UNIQUE (staff_number);


--
-- TOC entry 5064 (class 2606 OID 26695)
-- Name: lecturer_profiles lecturer_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT lecturer_profiles_user_id_key UNIQUE (user_id);


--
-- TOC entry 5151 (class 2606 OID 27298)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5030 (class 2606 OID 18501)
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- TOC entry 5032 (class 2606 OID 18499)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5147 (class 2606 OID 27268)
-- Name: project_contributions project_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_contributions
    ADD CONSTRAINT project_contributions_pkey PRIMARY KEY (id);


--
-- TOC entry 5139 (class 2606 OID 27191)
-- Name: project_documents project_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 5145 (class 2606 OID 27235)
-- Name: project_group_members project_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_group_members
    ADD CONSTRAINT project_group_members_pkey PRIMARY KEY (group_id, student_id);


--
-- TOC entry 5141 (class 2606 OID 27219)
-- Name: project_groups project_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_groups
    ADD CONSTRAINT project_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5120 (class 2606 OID 27041)
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- TOC entry 5125 (class 2606 OID 27074)
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 5117 (class 2606 OID 27012)
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- TOC entry 5034 (class 2606 OID 18510)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- TOC entry 5026 (class 2606 OID 18487)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 5028 (class 2606 OID 18485)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5071 (class 2606 OID 26746)
-- Name: semesters semesters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT semesters_pkey PRIMARY KEY (id);


--
-- TOC entry 5054 (class 2606 OID 26665)
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5056 (class 2606 OID 26669)
-- Name: student_profiles student_profiles_student_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_student_number_key UNIQUE (student_number);


--
-- TOC entry 5058 (class 2606 OID 26667)
-- Name: student_profiles student_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);


--
-- TOC entry 5129 (class 2606 OID 27103)
-- Name: assessment_components uq_assessment_component_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_components
    ADD CONSTRAINT uq_assessment_component_name UNIQUE (project_id, name);


--
-- TOC entry 5133 (class 2606 OID 27133)
-- Name: assessment_records uq_assessment_record; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_records
    ADD CONSTRAINT uq_assessment_record UNIQUE (assessment_component_id, student_id);


--
-- TOC entry 5102 (class 2606 OID 26896)
-- Name: attendance_checkpoints uq_attendance_checkpoint_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_checkpoints
    ADD CONSTRAINT uq_attendance_checkpoint_number UNIQUE (attendance_session_id, checkpoint_number);


--
-- TOC entry 5104 (class 2606 OID 26894)
-- Name: attendance_checkpoints uq_attendance_checkpoint_student; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_checkpoints
    ADD CONSTRAINT uq_attendance_checkpoint_student UNIQUE (attendance_session_id, student_id);


--
-- TOC entry 5110 (class 2606 OID 26926)
-- Name: attendance_records uq_attendance_record; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT uq_attendance_record UNIQUE (attendance_session_id, student_id);


--
-- TOC entry 5098 (class 2606 OID 26873)
-- Name: attendance_sessions uq_attendance_session_date; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT uq_attendance_session_date UNIQUE (class_session_id, session_date);


--
-- TOC entry 5087 (class 2606 OID 26821)
-- Name: class_definitions uq_class_definition; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_definitions
    ADD CONSTRAINT uq_class_definition UNIQUE (course_offering_id, name);


--
-- TOC entry 5092 (class 2606 OID 26845)
-- Name: class_sessions uq_class_session_schedule; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT uq_class_session_schedule UNIQUE (class_definition_id, day_of_week, start_time, end_time);


--
-- TOC entry 5069 (class 2606 OID 26726)
-- Name: courses uq_course_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT uq_course_code UNIQUE (code);


--
-- TOC entry 5077 (class 2606 OID 26763)
-- Name: course_offerings uq_course_offering; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT uq_course_offering UNIQUE (course_id, semester_id);


--
-- TOC entry 5049 (class 2606 OID 26644)
-- Name: departments uq_department_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT uq_department_code UNIQUE (code);


--
-- TOC entry 5051 (class 2606 OID 26646)
-- Name: departments uq_department_faculty_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT uq_department_faculty_name UNIQUE (faculty_id, name);


--
-- TOC entry 5137 (class 2606 OID 27168)
-- Name: files uq_files_storage_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT uq_files_storage_key UNIQUE (storage_key);


--
-- TOC entry 5143 (class 2606 OID 27221)
-- Name: project_groups uq_project_group_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_groups
    ADD CONSTRAINT uq_project_group_name UNIQUE (project_id, name);


--
-- TOC entry 5123 (class 2606 OID 27043)
-- Name: project_members uq_project_member; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT uq_project_member UNIQUE (project_id, student_id);


--
-- TOC entry 5073 (class 2606 OID 26748)
-- Name: semesters uq_semester_academic_year_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.semesters
    ADD CONSTRAINT uq_semester_academic_year_name UNIQUE (academic_year, name);


--
-- TOC entry 5083 (class 2606 OID 26796)
-- Name: course_enrollments uq_student_course_offering; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT uq_student_course_offering UNIQUE (student_id, course_offering_id);


--
-- TOC entry 5037 (class 2606 OID 18543)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5039 (class 2606 OID 18541)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5107 (class 1259 OID 27336)
-- Name: idx_attendance_records_attendance_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_records_attendance_session_id ON public.attendance_records USING btree (attendance_session_id);


--
-- TOC entry 5108 (class 1259 OID 27337)
-- Name: idx_attendance_records_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_records_student_id ON public.attendance_records USING btree (student_id);


--
-- TOC entry 5095 (class 1259 OID 27334)
-- Name: idx_attendance_sessions_class_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_sessions_class_session_id ON public.attendance_sessions USING btree (class_session_id);


--
-- TOC entry 5096 (class 1259 OID 27335)
-- Name: idx_attendance_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_sessions_expires_at ON public.attendance_sessions USING btree (expires_at);


--
-- TOC entry 5154 (class 1259 OID 27342)
-- Name: idx_audit_logs_actor_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_actor_user_id ON public.audit_logs USING btree (actor_user_id);


--
-- TOC entry 5155 (class 1259 OID 27343)
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- TOC entry 5090 (class 1259 OID 27333)
-- Name: idx_class_sessions_class_definition_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_class_sessions_class_definition_id ON public.class_sessions USING btree (class_definition_id);


--
-- TOC entry 5080 (class 1259 OID 27332)
-- Name: idx_course_enrollments_course_offering_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_course_enrollments_course_offering_id ON public.course_enrollments USING btree (course_offering_id);


--
-- TOC entry 5081 (class 1259 OID 27331)
-- Name: idx_course_enrollments_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_course_enrollments_student_id ON public.course_enrollments USING btree (student_id);


--
-- TOC entry 5067 (class 1259 OID 27330)
-- Name: idx_courses_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_courses_code ON public.courses USING btree (code);


--
-- TOC entry 5148 (class 1259 OID 27341)
-- Name: idx_notifications_read_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at);


--
-- TOC entry 5149 (class 1259 OID 27340)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 5118 (class 1259 OID 27339)
-- Name: idx_project_members_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_members_student_id ON public.project_members USING btree (student_id);


--
-- TOC entry 5115 (class 1259 OID 27338)
-- Name: idx_projects_course_offering_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_course_offering_id ON public.projects USING btree (course_offering_id);


--
-- TOC entry 5052 (class 1259 OID 27329)
-- Name: idx_student_profiles_student_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_profiles_student_number ON public.student_profiles USING btree (student_number);


--
-- TOC entry 5035 (class 1259 OID 27328)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5121 (class 1259 OID 27055)
-- Name: uq_one_group_leader_per_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_one_group_leader_per_project ON public.project_members USING btree (project_id) WHERE ((role)::text = 'GROUP_LEADER'::text);


--
-- TOC entry 5180 (class 2606 OID 26983)
-- Name: announcements fk_announcements_course_offering; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fk_announcements_course_offering FOREIGN KEY (course_offering_id) REFERENCES public.course_offerings(id) ON DELETE CASCADE;


--
-- TOC entry 5181 (class 2606 OID 26988)
-- Name: announcements fk_announcements_creator; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT fk_announcements_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5189 (class 2606 OID 27104)
-- Name: assessment_components fk_assessment_components_project; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_components
    ADD CONSTRAINT fk_assessment_components_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5190 (class 2606 OID 27144)
-- Name: assessment_records fk_assessment_records_assessor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_records
    ADD CONSTRAINT fk_assessment_records_assessor FOREIGN KEY (assessor_id) REFERENCES public.lecturer_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5191 (class 2606 OID 27134)
-- Name: assessment_records fk_assessment_records_component; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_records
    ADD CONSTRAINT fk_assessment_records_component FOREIGN KEY (assessment_component_id) REFERENCES public.assessment_components(id) ON DELETE CASCADE;


--
-- TOC entry 5192 (class 2606 OID 27139)
-- Name: assessment_records fk_assessment_records_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_records
    ADD CONSTRAINT fk_assessment_records_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5173 (class 2606 OID 26897)
-- Name: attendance_checkpoints fk_attendance_checkpoints_session; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_checkpoints
    ADD CONSTRAINT fk_attendance_checkpoints_session FOREIGN KEY (attendance_session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5174 (class 2606 OID 26902)
-- Name: attendance_checkpoints fk_attendance_checkpoints_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_checkpoints
    ADD CONSTRAINT fk_attendance_checkpoints_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5175 (class 2606 OID 26927)
-- Name: attendance_records fk_attendance_records_session; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT fk_attendance_records_session FOREIGN KEY (attendance_session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5176 (class 2606 OID 26932)
-- Name: attendance_records fk_attendance_records_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT fk_attendance_records_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5172 (class 2606 OID 26874)
-- Name: attendance_sessions fk_attendance_sessions_class_session; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT fk_attendance_sessions_class_session FOREIGN KEY (class_session_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5204 (class 2606 OID 27317)
-- Name: audit_logs fk_audit_logs_actor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5170 (class 2606 OID 26822)
-- Name: class_definitions fk_class_definitions_course_offering; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_definitions
    ADD CONSTRAINT fk_class_definitions_course_offering FOREIGN KEY (course_offering_id) REFERENCES public.course_offerings(id) ON DELETE CASCADE;


--
-- TOC entry 5171 (class 2606 OID 26846)
-- Name: class_sessions fk_class_sessions_class; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT fk_class_sessions_class FOREIGN KEY (class_definition_id) REFERENCES public.class_definitions(id) ON DELETE CASCADE;


--
-- TOC entry 5168 (class 2606 OID 26802)
-- Name: course_enrollments fk_course_enrollments_offering; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT fk_course_enrollments_offering FOREIGN KEY (course_offering_id) REFERENCES public.course_offerings(id) ON DELETE RESTRICT;


--
-- TOC entry 5169 (class 2606 OID 26797)
-- Name: course_enrollments fk_course_enrollments_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT fk_course_enrollments_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5165 (class 2606 OID 26764)
-- Name: course_offerings fk_course_offerings_course; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT fk_course_offerings_course FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- TOC entry 5166 (class 2606 OID 26774)
-- Name: course_offerings fk_course_offerings_lecturer; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT fk_course_offerings_lecturer FOREIGN KEY (lecturer_id) REFERENCES public.lecturer_profiles(id) ON DELETE SET NULL;


--
-- TOC entry 5167 (class 2606 OID 26769)
-- Name: course_offerings fk_course_offerings_semester; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_offerings
    ADD CONSTRAINT fk_course_offerings_semester FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE RESTRICT;


--
-- TOC entry 5164 (class 2606 OID 26727)
-- Name: courses fk_courses_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;


--
-- TOC entry 5159 (class 2606 OID 26647)
-- Name: departments fk_departments_faculty; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_departments_faculty FOREIGN KEY (faculty_id) REFERENCES public.faculties(id) ON DELETE RESTRICT;


--
-- TOC entry 5193 (class 2606 OID 27169)
-- Name: files fk_files_uploader; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT fk_files_uploader FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5177 (class 2606 OID 26961)
-- Name: learning_materials fk_learning_materials_creator; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_materials
    ADD CONSTRAINT fk_learning_materials_creator FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5178 (class 2606 OID 27174)
-- Name: learning_materials fk_learning_materials_file; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_materials
    ADD CONSTRAINT fk_learning_materials_file FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE RESTRICT;


--
-- TOC entry 5179 (class 2606 OID 26956)
-- Name: learning_materials fk_learning_materials_offering; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_materials
    ADD CONSTRAINT fk_learning_materials_offering FOREIGN KEY (course_offering_id) REFERENCES public.course_offerings(id) ON DELETE CASCADE;


--
-- TOC entry 5162 (class 2606 OID 26703)
-- Name: lecturer_profiles fk_lecturer_profile_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT fk_lecturer_profile_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;


--
-- TOC entry 5163 (class 2606 OID 26698)
-- Name: lecturer_profiles fk_lecturer_profile_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturer_profiles
    ADD CONSTRAINT fk_lecturer_profile_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5203 (class 2606 OID 27299)
-- Name: notifications fk_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5200 (class 2606 OID 27269)
-- Name: project_contributions fk_project_contributions_project; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_contributions
    ADD CONSTRAINT fk_project_contributions_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5201 (class 2606 OID 27274)
-- Name: project_contributions fk_project_contributions_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_contributions
    ADD CONSTRAINT fk_project_contributions_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5202 (class 2606 OID 27279)
-- Name: project_contributions fk_project_contributions_task; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_contributions
    ADD CONSTRAINT fk_project_contributions_task FOREIGN KEY (task_id) REFERENCES public.project_tasks(id) ON DELETE SET NULL;


--
-- TOC entry 5194 (class 2606 OID 27202)
-- Name: project_documents fk_project_documents_file; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT fk_project_documents_file FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE RESTRICT;


--
-- TOC entry 5195 (class 2606 OID 27192)
-- Name: project_documents fk_project_documents_project; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT fk_project_documents_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5196 (class 2606 OID 27197)
-- Name: project_documents fk_project_documents_uploader; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT fk_project_documents_uploader FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5198 (class 2606 OID 27236)
-- Name: project_group_members fk_project_group_members_group; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_group_members
    ADD CONSTRAINT fk_project_group_members_group FOREIGN KEY (group_id) REFERENCES public.project_groups(id) ON DELETE CASCADE;


--
-- TOC entry 5199 (class 2606 OID 27241)
-- Name: project_group_members fk_project_group_members_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_group_members
    ADD CONSTRAINT fk_project_group_members_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5197 (class 2606 OID 27222)
-- Name: project_groups fk_project_groups_project; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_groups
    ADD CONSTRAINT fk_project_groups_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5184 (class 2606 OID 27044)
-- Name: project_members fk_project_members_project; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT fk_project_members_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5185 (class 2606 OID 27049)
-- Name: project_members fk_project_members_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT fk_project_members_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5186 (class 2606 OID 27080)
-- Name: project_tasks fk_project_tasks_creator; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT fk_project_tasks_creator FOREIGN KEY (created_by) REFERENCES public.project_members(id) ON DELETE RESTRICT;


--
-- TOC entry 5187 (class 2606 OID 27248)
-- Name: project_tasks fk_project_tasks_group; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT fk_project_tasks_group FOREIGN KEY (group_id) REFERENCES public.project_groups(id) ON DELETE SET NULL;


--
-- TOC entry 5188 (class 2606 OID 27075)
-- Name: project_tasks fk_project_tasks_project; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT fk_project_tasks_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- TOC entry 5182 (class 2606 OID 27013)
-- Name: projects fk_projects_course_offering; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_course_offering FOREIGN KEY (course_offering_id) REFERENCES public.course_offerings(id) ON DELETE CASCADE;


--
-- TOC entry 5183 (class 2606 OID 27023)
-- Name: projects fk_projects_creator; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_creator FOREIGN KEY (created_by) REFERENCES public.lecturer_profiles(id) ON DELETE RESTRICT;


--
-- TOC entry 5160 (class 2606 OID 26675)
-- Name: student_profiles fk_student_profile_department; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT fk_student_profile_department FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;


--
-- TOC entry 5161 (class 2606 OID 26670)
-- Name: student_profiles fk_student_profile_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT fk_student_profile_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5158 (class 2606 OID 18544)
-- Name: users fk_users_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5156 (class 2606 OID 18516)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- TOC entry 5157 (class 2606 OID 18511)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


-- Completed on 2026-09-07 20:45:01

--
-- PostgreSQL database dump complete
--

\unrestrict hOKsVJ6eJM4OXKavaPET6IZTtfJc4ueClDHBR6OOxgfUwn2yFCgcHyaI6R8hxrn

