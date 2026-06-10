<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Database Schema

The application database is defined with Prisma under `prisma/schema.prisma` and `prisma/models/*.prisma`.
GitHub renders the Mermaid diagram below directly in the README.

```mermaid
erDiagram
  USER ||--o| USER_PROFILE : profile
  USER ||--o| PAYMENT_INFORMATION : payment_information
  USER ||--o{ COURSE : teaches
  USER ||--o{ COURSE_ENROLLMENT : enrollments
  USER ||--o{ COURSE_COMPLETION : completions
  USER ||--o{ CURRICULUM_PROGRESS : progress
  USER ||--o{ RESOURCE : uploads
  USER ||--o{ NOTIFICATION : notifications
  USER ||--o{ REVIEW : writes
  USER ||--o{ MESSAGE : sends
  USER ||--o{ CONVERSATION_PARTICIPANT : participates
  USER ||--o{ PAYMENT : student_payments
  USER ||--o{ PAYMENT : tutor_payments

  COURSE ||--o{ COURSE_ENROLLMENT : enrollments
  COURSE ||--o{ COURSE_COMPLETION : completions
  COURSE ||--o{ CURRICULUM_PROGRESS : progress
  COURSE ||--o{ CURRICULUM : lessons
  COURSE ||--o{ RESOURCE : resources
  COURSE ||--o{ PAYMENT : course_payments

  CONVERSATION ||--o{ CONVERSATION_PARTICIPANT : participants
  CONVERSATION ||--o{ MESSAGE : messages

  USER_PROFILE ||--o{ EDUCATION : education
  USER_PROFILE ||--o{ AVAILABILITY : availability
  USER_PROFILE ||--o{ REVIEW : received_reviews

  USER {
    string id PK
    string fullName
    string email
    string password
    datetime createdAt
    boolean isEmailVerified
    Role role
    datetime updatedAt
    string refreshTokenHash
    string otpCode
    datetime otpExpires
    boolean notifyCourseUpdates
    boolean notifyNewContent
    boolean notifyLessonReminders
    boolean notifyNewMessages
    boolean notifyWeeklyDigest
  }

  USER_PROFILE {
    string id PK
    string userId FK
    string country
    string city
    string avatarUrl
    string bio
    int yearOfExperience
    float pricePerHour
    string languageExpertise
    string aboutMe
    string teachingCategory
    string[] teachingSkills
    int sessionDuration
    string videoUrl
    ApplicationStatus applicationStatus
    datetime createdAt
    datetime updatedAt
    float averageRating
    int totalReviews
  }

  EDUCATION {
    string id PK
    string profileId FK
    string institution
    string country
    string city
    string degree
    int passingYear
    datetime createdAt
    datetime updatedAt
  }

  AVAILABILITY {
    string id PK
    string profileId FK
    DayOfWeek dayOfWeek
    string startTime
    string endTime
    string timezone
    datetime createdAt
    datetime updatedAt
  }

  PAYMENT_INFORMATION {
    string id PK
    string userId FK
    string paymentMethod
    string legalName
    string bankName
    string bankAccountName
    string bankAccountNumber
    string routingNumber
    datetime createdAt
    datetime updatedAt
  }

  COURSE {
    string id PK
    string tutorId FK
    string title
    string category
    string description
    string[] extraInfos
    string[] topics
    string requirement
    string image
    string[] curriculums
    datetime startDate
    string time
    string timeZone
    int classDuration
    string language
    int courseDuration
    float pricePerStudent
    int minStudent
    int maxStudent
    datetime enrollmentDeadline
    datetime createdAt
    datetime updatedAt
  }

  COURSE_ENROLLMENT {
    string id PK
    string courseId FK
    string studentId FK
    datetime createdAt
  }

  CURRICULUM_PROGRESS {
    string id PK
    string courseId FK
    string studentId FK
    int curriculumIndex
    datetime completedAt
  }

  COURSE_COMPLETION {
    string id PK
    string courseId FK
    string studentId FK
    datetime completedAt
  }

  CURRICULUM {
    string id PK
    string courseId FK
    string title
    datetime date
    string time
  }

  RESOURCE {
    string id PK
    string tutorId FK
    string courseId FK
    string name
    string url
    string size
    int downloads
    datetime createdAt
    datetime updatedAt
  }

  REVIEW {
    string id PK
    int rating
    string comment
    string reviewerId FK
    string tutorProfileId FK
    datetime createdAt
    datetime updatedAt
  }

  PAYMENT {
    string id PK
    string userId FK
    string tutorId FK
    string courseId FK
    float amount
    string currency
    PaymentStatus status
    PaymentType type
    PayoutStatus payoutStatus
    string stripeSessionId
    string stripePaymentIntentId
    datetime createdAt
    datetime updatedAt
  }

  NOTIFICATION {
    string id PK
    string userId FK
    string type
    string title
    string body
    json data
    string targetUrl
    boolean isRead
    datetime createdAt
    datetime deliveredAt
  }

  CONVERSATION {
    string id PK
    datetime createdAt
    datetime updatedAt
  }

  CONVERSATION_PARTICIPANT {
    string id PK
    string conversationId FK
    string userId FK
    datetime joinedAt
    datetime lastReadAt
  }

  MESSAGE {
    string id PK
    string conversationId FK
    string senderId FK
    string content
    MessageType messageType
    string fileUrl
    boolean isEdited
    boolean isDeleted
    datetime createdAt
    datetime updatedAt
  }

  CONTACT {
    string id PK
    string name
    string email
    string phone
    string message
    datetime createdAt
  }
```

### Enums

- `Role`: `STUDENT`, `TUTOR`, `ADMIN`
- `ApplicationStatus`: `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`
- `DayOfWeek`: `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`
- `PaymentStatus`: `PENDING`, `PAID`, `FAILED`, `CANCELLED`
- `PaymentType`: `GROUP`, `PRIVATE`
- `PayoutStatus`: `PENDING`, `PAID`
- `MessageType`: `TEXT`, `IMAGE`, `FILE`

## Backend Features

- JWT-based authentication for register, login, forgot password, reset password, and account deletion
- Role-based access control for `STUDENT`, `TUTOR`, and `ADMIN`
- Tutor profile management with availability, education, skills, pricing, and application status
- Admin review and approval flow for tutor applications
- Course creation, update, deletion, listing, and upcoming course discovery
- Student course enrollment and curriculum completion tracking
- Tutor class management for enrolled students, lesson overview, and course resources
- Stripe-powered checkout sessions for group courses and private tutoring
- Payment tracking for student and tutor transactions, dashboard summaries, and webhook processing
- Tutor dashboard analytics for revenue, students, lessons, notifications, and recent activity
- Real-time chat with conversations, messages, read status, and WebSocket support
- Review and rating system for tutors
- Resource upload and management for tutors and courses
- Settings management for tutor payment information and password changes
- Contact form submission and contact inquiry listing
- User and tutor administration endpoints for listing, filtering, and account management

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
