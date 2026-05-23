-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: May 23, 2026 at 12:01 PM
-- Server version: 11.8.6-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u301139053_bps_sop`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `sop_id` varchar(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `description` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_documents`
--

CREATE TABLE `sop_documents` (
  `id` varchar(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` longtext DEFAULT NULL,
  `department` varchar(255) NOT NULL,
  `responsible_person` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `approval_status` varchar(50) NOT NULL DEFAULT 'pending',
  `effective_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `version` int(11) DEFAULT 1,
  `file_url` text DEFAULT NULL,
  `created_by` varchar(36) NOT NULL,
  `approved_by` varchar(36) DEFAULT NULL,
  `updated_by` varchar(36) DEFAULT NULL,
  `tanggal_pembuatan` date DEFAULT NULL,
  `tanggal_revisi` date DEFAULT NULL,
  `tanggal_efektif` date DEFAULT NULL,
  `dasar_hukum` longtext DEFAULT NULL,
  `kualifikasi_pelaksana` longtext DEFAULT NULL,
  `keterkaitan` longtext DEFAULT NULL,
  `peralatan_perlengkapan` longtext DEFAULT NULL,
  `peringatan` longtext DEFAULT NULL,
  `pencatatan_pendataan` longtext DEFAULT NULL,
  `maksud` longtext DEFAULT NULL,
  `tujuan` longtext DEFAULT NULL,
  `flowchart_steps` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`flowchart_steps`)),
  `pelaksana_columns` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pelaksana_columns`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sop_revisions`
--

CREATE TABLE `sop_revisions` (
  `id` varchar(36) NOT NULL,
  `sop_id` varchar(36) NOT NULL,
  `title` varchar(500) NOT NULL,
  `version` int(11) NOT NULL,
  `changes_description` longtext NOT NULL,
  `revision_type` varchar(50) NOT NULL DEFAULT 'update',
  `status` varchar(100) NOT NULL DEFAULT 'menunggu_persetujuan',
  `revised_by` varchar(36) NOT NULL,
  `reviewed_by` varchar(36) DEFAULT NULL,
  `revision_date` datetime DEFAULT NULL,
  `approval_date` datetime DEFAULT NULL,
  `review_notes` longtext DEFAULT NULL,
  `old_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_data`)),
  `new_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_data`)),
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'staf',
  `department` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `join_date` date DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `department`, `phone`, `avatar_url`, `is_active`, `join_date`, `last_login`, `created_at`) VALUES
('86583cac-eaf7-4c6e-a935-fd8594c608c0', 'atha@bps-surabaya.go.id', '$2a$12$aBSLoDr.3.kJ9ZNUlXfIE.FaYXgh/Zcj8nYxJsFhs9ubdXNamFIhG', 'atha', 'staf', 'SAKIP, ZI dan EPSS', NULL, NULL, 1, '2026-04-13', '2026-04-13 06:28:08', '2026-04-13 06:28:02'),
('d0ccef4b-4f34-46f6-939c-b900407d7281', 'admin@bps-surabaya.go.id', '$2a$12$t3k1f22Yl3Fp2ASux212YOzHoSz8jvwN/.Bw9ZnTINbrJdenfmrZe', 'Super Admin BPS', 'admin', 'Sistem Informasi', NULL, NULL, 1, '2026-03-05', '2026-05-23 11:55:16', '2026-03-05 04:26:39'),
('f4b5596f-9381-4a94-8a9a-33d614c9b503', 'alvikirana138@bps-surabaya.go.id', '$2a$12$t3k1f22Yl3Fp2ASux212YOzHoSz8jvwN/.Bw9ZnTINbrJdenfmrZe', 'Muhammad Alvi Kirana Zulfan Nazal', 'admin', 'Humas, Pojok Statistik dan PSS', '08165457757', NULL, 1, '2026-03-05', '2026-05-23 11:49:30', '2026-03-05 05:52:00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sop_documents`
--
ALTER TABLE `sop_documents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `sop_revisions`
--
ALTER TABLE `sop_revisions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
