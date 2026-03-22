# TrakX – Personal Finance Tracking App

A full-stack mobile application that helps users track expenses, analyze spending patterns, and manage personal finances efficiently.

Built with a production-ready architecture, focusing on scalability, clean system design, and real-world usability.

## Features
- 🔐 **Authentication System**
  - Secure user signup & login
  - Protected routes (analytics & transactions)
- 💰 **Transaction Management**
  - Add, view, and categorize expenses
  - Real-time updates
- 📊 **Analytics Dashboard**
  - Visual breakdown of spending
  - Category-wise insights
- 📩 **SMS-based Expense Detection (Core Feature 🚀)**
  - Automatically reads transactional SMS messages
  - Extracts amount, merchant, and type (debit/credit)
  - Converts SMS into structured transactions
  - Reduces manual expense entry
- 🏠 **Clean UI/UX**
  - Minimal and intuitive interface
  - Mobile-first design using Expo
- ⚙️ **Backend Integration**
  - REST APIs for all operations
  - Structured and scalable backend

## Key Highlights
- Designed a scalable full-stack fintech application with React Native and Node.js
- Implemented SMS parsing system to automatically extract financial transactions
- Built secure authentication (JWT) with protected route architecture
- Developed transaction processing pipeline (`raw SMS → parsed data → structured DB entry`)
- Designed backend using modular MVC architecture