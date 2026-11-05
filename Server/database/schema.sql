DROP DATABASE IF EXISTS goal_gate;
CREATE DATABASE goal_gate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(120) UNIQUE,
  joined_at DATE,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','secretary','finance','member') NOT NULL DEFAULT 'member',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE contribution_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL UNIQUE,
  monthly_amount DECIMAL(12,2) NOT NULL,
  yearly_amount DECIMAL(12,2) NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  payment_type ENUM('monthly','yearly') NOT NULL,
  period_year INT NOT NULL,
  period_month TINYINT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  method ENUM('cash','cbe','telebirr','other') NOT NULL,
  reference_no VARCHAR(60),
  receipt_path VARCHAR(255),
  note VARCHAR(255),
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  recorded_by INT NOT NULL,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  reject_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) UNIQUE,
  content TEXT NOT NULL,
  cover_image VARCHAR(255),
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  author_id INT NOT NULL,
  published_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  image VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gallery_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_path VARCHAR(255) NOT NULL,
  caption VARCHAR(200),
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120),
  phone VARCHAR(30),
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50),
  entity_id INT,
  details VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE payments
  ADD COLUMN source ENUM('member','finance') NOT NULL DEFAULT 'finance' AFTER status;
  
  ALTER TABLE payments ADD COLUMN receipt_url VARCHAR(500) NULL AFTER receipt_path;
  ALTER TABLE payments ADD COLUMN period_quarter TINYINT NULL AFTER period_month;

  ALTER TABLE contribution_settings
  ADD COLUMN q1_due DATE NULL, ADD COLUMN q2_due DATE NULL,
  ADD COLUMN q3_due DATE NULL, ADD COLUMN q4_due DATE NULL;

  ALTER TABLE announcements
  ADD COLUMN category ENUM('general','monthly_rate','yearly_rate','committee_meeting','general_meeting')
      NOT NULL DEFAULT 'general' AFTER content,
  ADD COLUMN meeting_link VARCHAR(500) NULL AFTER category,
  ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER meeting_link;

  ALTER TABLE contact_messages
  ADD COLUMN subject VARCHAR(200) NULL AFTER phone,
  ADD COLUMN user_type VARCHAR(30) NULL AFTER subject,
  ADD COLUMN replied_at DATETIME NULL,
  ADD COLUMN replied_by INT NULL;