# Quiz Platform Testing Guide

## Test the Application Manually

The application is now running at **http://localhost:3002**

### 1. Test Teacher Login
- Go to http://localhost:3002
- Select "Teacher" role
- Use Faculty ID: `TEACH001` (or any ID starting with letters)
- Password: `teacher123` (or any password)
- Should redirect to teacher dashboard

### 2. Test Student Login  
- Go to http://localhost:3002
- Select "Student" role
- Use Roll Number: `2024001` (or any numeric ID)
- Password: `student123` (or any password)
- Should redirect to student dashboard

### 3. Test Quiz Creation (Teacher)
- From teacher dashboard, click "Create New Quiz"
- Fill in quiz details:
  - Title: "Sample Math Quiz"
  - Topic: "Algebra"
  - Description: "Basic algebra questions"
  - Question Count: 5
  - Time Limit: 10 minutes
  - Type: "Live Session" or "Slip Test"
- Click "Create Quiz"

### 4. Test Quiz Management (Teacher)
- View created quizzes in the dashboard
- Start a live quiz to get session code
- View quiz details and status

### 5. Test Quiz Joining (Student)
- From student dashboard, use session code to join live quiz
- Or browse available slip tests
- Join a quiz

### 6. Test Quiz Taking (Student)
- Answer the AI-generated questions
- Submit answers
- View results with feedback

### 7. Test Results & Feedback
- Check the results page for:
  - Score and percentage
  - Detailed feedback for each question
  - Solutions and explanations
  - Overall performance summary

## API Endpoints to Test

You can also test the API endpoints directly:

### Authentication
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"TEACH001","password":"teacher123","userType":"teacher"}'
```

### Quiz Creation
```bash
curl -X POST http://localhost:3002/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Quiz","topic":"Math","questionCount":3,"timeLimit":5,"type":"live","createdBy":"TEACH001"}'
```

### Quiz List
```bash
curl http://localhost:3002/api/quiz?createdBy=TEACH001
```

All core features should be working properly!
