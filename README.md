# WebSimpleDemo - Social Network Application

A comprehensive social network application built with React and Firebase, supporting user registration, login, posting, commenting, and image uploading features.

## Project Overview

This project demonstrates a modern social networking application with the following features:
- User authentication (register/login)
- Creating posts with text and images
- Adding comments to posts
- Liking and sharing posts
- Real-time updates
- Responsive design

## Quick Start Guide

1. **Clone the repository**:
   ```
   git clone https://github.com/yourusername/WebSimpleDemo.git
   cd WebSimpleDemo
   ```

2. **Install dependencies**:
   ```
   cd social-network
   npm install
   ```
   
   Note: The `requirements.txt` file is for reference only and lists all dependencies with their versions. This is a JavaScript project, so use npm for installation, not pip.

3. **Start the development server**:
   ```
   npm start
   ```

4. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Detailed Deployment Guide

### Step 1: System Requirements

Ensure your system meets the following requirements (as listed in requirements.txt):
- Node.js (v14.0.0 or higher)
- npm (v6.14.0 or higher)
- Modern browser (Chrome, Firefox, Safari, Edge)

### Step 2: Project Setup

1. **Clone the repository**:
   ```
   git clone https://github.com/yourusername/WebSimpleDemo.git
   cd WebSimpleDemo
   ```

2. **Navigate to the application directory**:
   ```
   cd social-network
   ```

3. **Install all required dependencies**:
   ```
   npm install
   ```
   
   To install specific versions listed in requirements.txt:
   ```
   # Example of installing specific versions
   npm install react@19.0.0 react-dom@19.0.0 firebase@11.4.0 react-router-dom@7.3.0
   ```

### Step 3: Firebase Configuration

1. **Create a Firebase project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the setup steps
   - Once created, click on the Web icon (</>) to add a web app
   - Register your app with a nickname (e.g., "social-network-web")
   - Copy the provided Firebase configuration

2. **Configure the application**:
   - Create a `.env` file in the `social-network` directory
   - Add the following environment variables with your Firebase configuration:
     ```
     REACT_APP_FIREBASE_API_KEY=your-api-key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
     REACT_APP_FIREBASE_PROJECT_ID=your-project-id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
     REACT_APP_FIREBASE_APP_ID=your-app-id
     ```

3. **Set up Firebase services**:
   - In the Firebase console, navigate to "Authentication"
     - Go to "Sign-in method" tab
     - Enable "Email/Password" authentication
   
   - Set up Firestore Database:
     - Go to "Firestore Database" in the Firebase console
     - Click "Create database"
     - Choose a location closest to your users
     - Start in test mode for development
   
   - Configure Firebase Storage:
     - Go to "Storage" in the Firebase console
     - Click "Get started"
     - Follow the setup wizard
     - After setup, go to the "Rules" tab and set the following rules:
       ```
       rules_version = '2';
       service firebase.storage {
         match /b/{bucket}/o {
           match /{allPaths=**} {
             allow read;
             allow write: if request.auth != null;
           }
         }
       }
       ```

### Step 4: Running the Application

1. **Start the development server**:
   ```
   npm start
   ```

2. **Access the application**:
   - The browser will automatically open to [http://localhost:3000](http://localhost:3000)
   - If it doesn't open automatically, manually navigate to that URL

### Step 5: Building for Production

1. **Create a production build**:
   ```
   npm run build
   ```

2. **Deploy to Firebase Hosting**:
   - Install Firebase tools:
     ```
     npm install -g firebase-tools
     ```
   
   - Login to Firebase:
     ```
     firebase login
     ```
   
   - Initialize Firebase in your project:
     ```
     firebase init
     ```
     - Select "Hosting"
     - Select your Firebase project
     - Specify "build" as your public directory
     - Configure as a single-page app: Yes
   
   - Deploy to Firebase:
     ```
     firebase deploy
     ```

## Troubleshooting Common Issues

### CORS Errors with Image Uploads

If you encounter CORS errors when uploading images:
1. Verify your Firebase Storage bucket name in the configuration
2. Check that Storage rules are correctly set up
3. Ensure you're authenticated before attempting uploads

### Authentication Issues

1. Make sure Firebase Authentication is properly enabled in the console
2. Check that your `.env` file contains the correct Firebase credentials
3. Verify your network connection

### Dependency Issues

If you encounter dependency-related errors:
1. Ensure Node.js and npm versions meet the requirements 
2. Try installing dependencies one by one if batch installation fails
3. Clear npm cache with `npm cache clean --force` and try again

### ESLint Warnings

You may see ESLint warnings related to React Hooks dependencies and alt attributes. These don't affect functionality but can be fixed:

1. For React Hook useEffect warnings:
   ```javascript
   // Add handleClickOutside to the dependency array
   useEffect(() => {
     // function code
   }, [handleClickOutside]);
   ```

2. For redundant alt attributes:
   ```javascript
   // Change from
   <img src="..." alt="User profile image" />
   // To
   <img src="..." alt="User profile" />
   ```

## Project Structure

```
social-network/
├── public/              # Static resources
├── src/
│   ├── components/      # UI components
│   ├── config/          # Firebase configuration
│   ├── contexts/        # React contexts
│   ├── pages/           # Page components
│   ├── services/        # Firebase service functions
│   ├── App.js           # Main app component
│   └── index.js         # Application entry point
├── .env                 # Environment variables (create this)
├── requirements.txt     # Dependency versions (reference only)
└── package.json         # Dependencies and scripts
```

## Additional Resources

- [React Documentation](https://reactjs.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting)
