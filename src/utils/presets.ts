
export interface PresetSchema {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const PRESET_SCHEMAS: PresetSchema[] = [
  {
    id: "blog",
    name: "Simple Blog",
    description: "Standard model with users, posts, and simple database attributes.",
    code: `model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String?
  role  Role   @default(USER)
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}

enum Role {
  USER
  ADMIN
}`
  },
  {
    id: "ecommerce",
    name: "E-Commerce Suite",
    description: "Multi-layered database featuring customers, orders, reviews, and product categories.",
    code: `model Customer {
  id        String   @id @default(uuid())
  email     String   @unique
  fullName  String
  createdAt DateTime @default(now())
  orders    Order[]
  reviews   Review[]
}

model Product {
  id          String      @id @default(uuid())
  title       String
  description String?
  price       Decimal
  stockCount  Int         @default(0)
  categoryId  Int
  category    Category    @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
  reviews     Review[]
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[]
}

model Order {
  id         String      @id @default(uuid())
  totalPrice Decimal
  status     OrderStatus @default(PENDING)
  createdAt  DateTime    @default(now())
  customerId String
  customer   Customer    @relation(fields: [customerId], references: [id])
  items      OrderItem[]
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  quantity  Int
  price     Decimal
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])
  productId String
  product   Product @relation(fields: [productId], references: [id])
}

model Review {
  id         String   @id @default(uuid())
  rating     Int
  comment    String?
  createdAt  DateTime @default(now())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}`
  },
  {
    id: "saas",
    name: "SaaS Project Tracker",
    description: "Granular workspaces, projects, status-tracked tasks, multi-user assignees, and comments.",
    code: `model Workspace {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  ownerId   String
  projects  Project[]
}

model Project {
  id          String    @id @default(cuid())
  name        String
  description String?
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  tasks       Task[]
}

model User {
  id        String    @id
  email     String    @unique
  username  String
  assigned  Task[]    @relation("TaskAssignee")
  created   Task[]    @relation("TaskCreator")
  comments  Comment[]
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id])
  creatorId   String
  creator     User       @relation("TaskCreator", fields: [creatorId], references: [id])
  assigneeId  String?
  assignee    User?      @relation("TaskAssignee", fields: [assigneeId], references: [id])
  comments    Comment[]
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  createdAt DateTime @default(now())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id])
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}`
  },
  {
    id: "social",
    name: "Social Network Graph",
    description: "User profiles, followers/following self-relations, post likes, and multiple implicit lists.",
    code: `model User {
  id         String    @id @default(uuid())
  handle     String    @unique
  createdAt  DateTime  @default(now())
  profile    Profile?
  posts      Post[]
  likes      Like[]
  followers  Follows[] @relation("following")
  following  Follows[] @relation("follower")
}

model Profile {
  id     Int     @id @default(autoincrement())
  bio    String?
  avatar String?
  userId String  @unique
  user   User    @relation(fields: [userId], references: [id])
}

model Follows {
  followerId  String
  follower    User   @relation("follower", fields: [followerId], references: [id])
  followingId String
  following   User   @relation("following", fields: [followingId], references: [id])

  @@id([followerId, followingId])
}

model Post {
  id        String   @id @default(uuid())
  content   String
  createdAt DateTime @default(now())
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  likes     Like[]
}

model Like {
  userId String
  user   User   @relation(fields: [userId], references: [id])
  postId String
  post   Post   @relation(fields: [postId], references: [id])

  @@id([userId, postId])
}`
  }
];
