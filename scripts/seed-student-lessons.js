require('dotenv/config');

const bcrypt = require('bcrypt');
const { PrismaClient, Role } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const STUDENT_ID = 'a9177f21-01f3-424b-ace5-48b1d73cca91';
const TUTOR_ID = '11111111-1111-4111-8111-111111111111';

const COURSE_IDS = {
  upcoming: '22222222-2222-4222-8222-222222222221',
  completed: '22222222-2222-4222-8222-222222222222',
  cancelled: '22222222-2222-4222-8222-222222222223',
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function main() {
  const now = new Date();
  const studentPasswordHash = await bcrypt.hash('student123', 10);
  const tutorPasswordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { id: STUDENT_ID },
    update: {
      fullName: 'Istiak Turjo',
      email: 'student@gmail.com',
      password: studentPasswordHash,
      role: Role.STUDENT,
      isEmailVerified: true,
    },
    create: {
      id: STUDENT_ID,
      fullName: 'Istiak Turjo',
      email: 'student@gmail.com',
      password: studentPasswordHash,
      role: Role.STUDENT,
      isEmailVerified: true,
      profile: {
        create: {
          avatarUrl:
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
          applicationStatus: 'APPROVED',
        },
      },
    },
  });

  const tutor = await prisma.user.upsert({
    where: { id: TUTOR_ID },
    update: {
      fullName: 'David Chen',
      email: 'david.chen@daan.test',
      password: tutorPasswordHash,
      role: Role.TUTOR,
      isEmailVerified: true,
    },
    create: {
      id: TUTOR_ID,
      fullName: 'David Chen',
      email: 'david.chen@daan.test',
      password: tutorPasswordHash,
      role: Role.TUTOR,
      isEmailVerified: true,
    },
  });

  const tutorProfile = await prisma.userProfile.upsert({
    where: { userId: tutor.id },
    update: {
      avatarUrl:
        'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=240&h=240&fit=crop',
      bio: 'Passionate about making complex concepts simple.',
      yearOfExperience: 8,
      teachingCategory: 'Programming',
      teachingSkills: ['JavaScript', 'Mathematics', 'Web Development'],
      applicationStatus: 'APPROVED',
      averageRating: 5,
      totalReviews: 1,
    },
    create: {
      userId: tutor.id,
      avatarUrl:
        'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=240&h=240&fit=crop',
      bio: 'Passionate about making complex concepts simple.',
      yearOfExperience: 8,
      teachingCategory: 'Programming',
      teachingSkills: ['JavaScript', 'Mathematics', 'Web Development'],
      applicationStatus: 'APPROVED',
      averageRating: 5,
      totalReviews: 1,
    },
  });

  const courses = [
    {
      id: COURSE_IDS.upcoming,
      title: 'JavaScript Advanced Concepts',
      category: 'Programming',
      description: 'Advanced JavaScript live lessons for students.',
      image:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&h=360&fit=crop',
      curriculums: [
        'Closures and Scope',
        'Async JavaScript',
        'Performance Patterns',
        'Final Project Review',
      ],
      startDate: addDays(now, 1),
      time: '3:00 pm',
      classDuration: 60,
      maxStudent: 1,
      pricePerStudent: 80,
    },
    {
      id: COURSE_IDS.completed,
      title: 'Web Development Bootcamp',
      category: 'Web Development',
      description: 'Completed bootcamp lessons ready for review state.',
      image:
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&h=360&fit=crop',
      curriculums: [
        'HTML and CSS Foundations',
        'Responsive Layouts',
        'JavaScript Components',
        'Deployment Session',
      ],
      startDate: addDays(now, -8),
      time: '3:00 pm',
      classDuration: 60,
      maxStudent: 12,
      pricePerStudent: 120,
    },
    {
      id: COURSE_IDS.cancelled,
      title: 'French Conversation',
      category: 'Language',
      description: 'Cancelled demo lessons for the student panel.',
      image:
        'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=640&h=360&fit=crop',
      curriculums: ['Pronunciation Practice', 'Daily Conversation'],
      startDate: addDays(now, 2),
      time: '3:00 pm',
      classDuration: 60,
      maxStudent: 8,
      pricePerStudent: 60,
    },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { id: course.id },
      update: {
        ...course,
        tutorId: tutor.id,
        extraInfos: ['Live class', 'Certificate included'],
        topics: course.curriculums,
        requirement: 'Internet connection and a notebook',
        timeZone: 'Asia/Dhaka',
        language: 'English',
        courseDuration: course.curriculums.length,
        minStudent: 1,
        enrollmentDeadline: addDays(now, 30),
      },
      create: {
        ...course,
        tutorId: tutor.id,
        extraInfos: ['Live class', 'Certificate included'],
        topics: course.curriculums,
        requirement: 'Internet connection and a notebook',
        timeZone: 'Asia/Dhaka',
        language: 'English',
        courseDuration: course.curriculums.length,
        minStudent: 1,
        enrollmentDeadline: addDays(now, 30),
      },
    });

    await prisma.courseEnrollment.upsert({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: STUDENT_ID,
        },
      },
      update: {},
      create: {
        courseId: course.id,
        studentId: STUDENT_ID,
      },
    });
  }

  for (let index = 0; index < 4; index += 1) {
    await prisma.curriculumProgress.upsert({
      where: {
        courseId_studentId_curriculumIndex: {
          courseId: COURSE_IDS.completed,
          studentId: STUDENT_ID,
          curriculumIndex: index,
        },
      },
      update: {},
      create: {
        courseId: COURSE_IDS.completed,
        studentId: STUDENT_ID,
        curriculumIndex: index,
      },
    });
  }

  await prisma.courseCompletion.upsert({
    where: {
      courseId_studentId: {
        courseId: COURSE_IDS.completed,
        studentId: STUDENT_ID,
      },
    },
    update: {},
    create: {
      courseId: COURSE_IDS.completed,
      studentId: STUDENT_ID,
    },
  });

  for (let index = 0; index < 2; index += 1) {
    await prisma.studentLessonState.upsert({
      where: {
        courseId_studentId_curriculumIndex: {
          courseId: COURSE_IDS.cancelled,
          studentId: STUDENT_ID,
          curriculumIndex: index,
        },
      },
      update: {
        status: 'cancelled',
        reason: 'Tutor cancelled this lesson',
      },
      create: {
        courseId: COURSE_IDS.cancelled,
        studentId: STUDENT_ID,
        curriculumIndex: index,
        status: 'cancelled',
        reason: 'Tutor cancelled this lesson',
      },
    });
  }

  await prisma.review.upsert({
    where: {
      reviewerId_tutorProfileId: {
        reviewerId: STUDENT_ID,
        tutorProfileId: tutorProfile.id,
      },
    },
    update: {
      rating: 5,
      comment: 'This is a really impressive course.',
    },
    create: {
      reviewerId: STUDENT_ID,
      tutorProfileId: tutorProfile.id,
      rating: 5,
      comment: 'This is a really impressive course.',
    },
  });

  console.log('Seeded student lesson demo data');
  console.log(`Student ID: ${STUDENT_ID}`);
  console.log(`Upcoming lessons: 4`);
  console.log(`Completed lessons: 4`);
  console.log(`Cancelled lessons: 2`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
