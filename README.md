# Social Network App - Image & Text Sharing Community

## Project Overview

This project is a social network application built with React and Firebase, supporting features such as posting, commenting, and liking. Special features include image uploading and emoji selectors, providing users with a rich interactive experience.

## Features

- User registration and login
- Text and image post creation
- Comments (supporting text and images)
- Like interactions
- Real-time data updates
- Emoji selector
- Responsive design for mobile devices

## Requirements

- Node.js 14.0.0 or higher
- npm 6.14.0 or higher
- Modern browsers (Chrome, Firefox, Safari, Edge, etc.)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/social-network.git
cd social-network
```

### 2. Install Dependencies

Using npm to install dependencies:

```bash
npm install
```

Alternatively, you can check `requirements.txt` for specific dependency versions and install them manually:

```bash
# View dependency information
cat requirements.txt

# Manually install specific versions
npm install react@19.0.0 react-dom@19.0.0 firebase@11.4.0
# ... other dependencies
```

### 3. Configure Firebase

1. Visit the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Find Web app configuration in project settings
4. Create a `.env` file and add the following content (replace with your Firebase configuration):

```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

5. In the Firebase console, enable the following services:
   - Authentication (enable email/password login)
   - Firestore Database
   - Storage

### 4. Start the Development Server

```bash
npm start
```

The application will run at [http://localhost:3000](http://localhost:3000).

## User Guide

### Registration/Login

1. Open the app and click the "Register" or "Login" button in the navigation bar
2. Fill in the required information and submit the form
3. After successful login, you will automatically be redirected to the home page

### Creating Posts

1. Enter content in the posting box at the top of the home page
2. You can click the "😊 Emoji" button to insert emojis
3. You can click the "📷 Image" button to upload images (supports PNG, JPG, JPEG, GIF formats, maximum 5MB)
4. Click the "Post" button to publish

### Commenting

1. Click the "Comments" button below a post to expand the comment section
2. Enter content in the comment input field
3. You can click the emoji button (😊) to insert emojis
4. You can click the image button (📷) to upload images (maximum 2MB)
5. Click the "Post" button to publish your comment

### Liking

- Click the "Like" button below a post to like it
- Click again to unlike

### Deleting Content

- You can delete your own posts and comments
- Click the "✕" button in the top right corner of the post or comment

## Project Structure

```
social-network/
├── public/              # Static resources
├── src/                 # Source code
│   ├── components/      # Components
│   ├── contexts/        # React contexts
│   ├── services/        # Firebase services
│   ├── config/          # Configuration files
│   ├── pages/           # Page components
│   ├── App.js           # App entry
│   └── index.js         # React entry
├── .env                 # Environment variables
├── requirements.txt     # Dependency version information
└── package.json         # Project dependencies
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However, we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Key Technologies

- **Frontend**: React, CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Libraries**: emoji-picker-react, date-fns, Material-UI

## Troubleshooting

### Can't Log In?

- Confirm that your username and password are correct
- Check your network connection
- Verify that the Firebase configuration is correct

### Image Upload Failed?

- Confirm that the image size does not exceed the limit (5MB for posts, 2MB for comments)
- Check your network connection
- Verify that Firebase Storage rules are configured correctly

### Emoji Selector Not Displaying?

- Confirm that the emoji-picker-react library is installed
- Check if your browser supports modern JavaScript features

### npm Dependency Installation Failed?

- Check the `requirements.txt` file for specific versions of all dependencies
- Try installing dependencies one by one to identify which one is causing the issue
- Verify that your Node.js and npm versions meet the requirements

## Data Security

This application uses Firebase security rules to protect user data. Only logged-in users can create content, and users can only modify or delete their own content.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

To learn Firebase, check out the [Firebase documentation](https://firebase.google.com/docs).

## Contact

For questions or suggestions, please contact: your-email@example.com

## License

MIT License
