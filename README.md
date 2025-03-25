# Media Host API

Media Host API is a backend service for managing media files. It provides authentication, API key access, and various endpoints for uploading, retrieving, and managing media files.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
    - [Register](#register)
    - [Login](#login)
    - [Get Profile](#get-profile)
    - [Update Profile](#update-profile)
  - [Media](#media)
    - [Upload Media](#upload-media)
    - [Get User Media](#get-user-media)
    - [Get Media by ID](#get-media-by-id)
    - [Delete Media](#delete-media)
    - [Optimize Media](#optimize-media)
  - [API Keys](#api-keys)
    - [Create API Key](#create-api-key)
    - [Get User API Keys](#get-user-api-keys)
    - [Delete API Key](#delete-api-key)
  - [External API](#external-api)
    - [Upload Media](#external-upload-media)
    - [Get User Media](#external-get-user-media)
    - [Get Media by ID](#external-get-media-by-id)
    - [Delete Media](#external-delete-media)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mediavaultbackend.git
   cd mediavaultbackend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Create a `.env` file in the root directory and add the following environment variables:

````env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
NODE_ENV=development
UPLOAD_PATH=uploads
````

## Running the Application

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the application:
   ```bash
   npm start
   ```

3. For development, use:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication

#### Register

- **URL:** `/api/auth/register`
- **Method:** `POST`
- **Access:** Public
- **Description:** Register a new user.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "jwt_token"
  }
  ```

#### Login

- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Access:** Public
- **Description:** Authenticate user and get token.
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "jwt_token"
  }
  ```

#### Get Profile

- **URL:** `/api/auth/profile`
- **Method:** `GET`
- **Access:** Private
- **Description:** Get current user profile.
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

#### Update Profile

- **URL:** `/api/auth/profile`
- **Method:** `PUT`
- **Access:** Private
- **Description:** Update user profile.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "newpassword123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Media

#### Upload Media

- **URL:** `/api/media`
- **Method:** `POST`
- **Access:** Private
- **Description:** Upload a media file.
- **Request:** Multipart form-data with a file field named `file`.
- **Response:**
  ```json
  {
    "success": true,
    "message": "Media uploaded successfully",
    "media": {
      "id": "media_id",
      "fileName": "file_name",
      "originalFileName": "original_file_name",
      "fileType": "file_type",
      "fileSize": 12345,
      "fileUrl": "file_url",
      "thumbnailUrl": "thumbnail_url",
      "optimizedFileUrl": "optimized_file_url",
      "isOptimized": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

#### Get User Media

- **URL:** `/api/media`
- **Method:** `GET`
- **Access:** Private
- **Description:** Get all media files for a user.
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Number of items per page (default: 10)
  - `fileType` (optional): Filter by file type (e.g., `image`, `video`)
- **Response:**
  ```json
  {
    "success": true,
    "count": 10,
    "total": 100,
    "page": 1,
    "pages": 10,
    "media": [
      {
        "id": "media_id",
        "fileName": "file_name",
        "originalFileName": "original_file_name",
        "fileType": "file_type",
        "fileSize": 12345,
        "fileUrl": "file_url",
        "thumbnailUrl": "thumbnail_url",
        "optimizedFileUrl": "optimized_file_url",
        "isOptimized": true,
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### Get Media by ID

- **URL:** `/api/media/:id`
- **Method:** `GET`
- **Access:** Private
- **Description:** Get a media file by ID.
- **Response:**
  ```json
  {
    "success": true,
    "media": {
      "id": "media_id",
      "fileName": "file_name",
      "originalFileName": "original_file_name",
      "fileType": "file_type",
      "fileSize": 12345,
      "fileUrl": "file_url",
      "thumbnailUrl": "thumbnail_url",
      "optimizedFileUrl": "optimized_file_url",
      "isOptimized": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

#### Delete Media

- **URL:** `/api/media/:id`
- **Method:** `DELETE`
- **Access:** Private
- **Description:** Delete a media file.
- **Response:**
  ```json
  {
    "success": true,
    "message": "Media deleted successfully",
    "id": "media_id"
  }
  ```

#### Optimize Media

- **URL:** `/api/media/:id/optimize`
- **Method:** `POST`
- **Access:** Private
- **Description:** Optimize a media file.
- **Response:**
  ```json
  {
    "success": true,
    "message": "Media optimized successfully",
    "media": {
      "id": "media_id",
      "fileUrl": "optimized_file_url",
      "isOptimized": true,
      "fileSize": 12345
    }
  }
  ```

### API Keys

#### Create API Key

- **URL:** `/api/keys`
- **Method:** `POST`
- **Access:** Private
- **Description:** Create a new API key.
- **Request Body:**
  ```json
  {
    "name": "My API Key"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "API key created successfully",
    "apiKey": {
      "id": "api_key_id",
      "name": "My API Key",
      "key": "api_key",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

#### Get User API Keys

- **URL:** `/api/keys`
- **Method:** `GET`
- **Access:** Private
- **Description:** Get all API keys for a user.
- **Response:**
  ```json
  {
    "success": true,
    "count": 2,
    "apiKeys": [
      {
        "id": "api_key_id",
        "name": "My API Key",
        "key": "api_key",
        "createdAt": "2023-01-01T00:00:00.000Z",
        "lastUsed": "2023-01-02T00:00:00.000Z"
      }
    ]
  }
  ```

#### Delete API Key

- **URL:** `/api/keys/:id`
- **Method:** `DELETE`
- **Access:** Private
- **Description:** Delete an API key.
- **Response:**
  ```json
  {
    "success": true,
    "message": "API key deleted successfully",
    "id": "api_key_id"
  }
  ```

### External API

#### Upload Media

- **URL:** `/api/external/media`
- **Method:** `POST`
- **Access:** API Key
- **Description:** Upload a media file via external API.
- **Request:** Multipart form-data with a file field named `file`.
- **Response:**
  ```json
  {
    "success": true,
    "message": "Media uploaded successfully",
    "media": {
      "id": "media_id",
      "fileName": "file_name",
      "originalFileName": "original_file_name",
      "fileType": "file_type",
      "fileSize": 12345,
      "fileUrl": "file_url",
      "thumbnailUrl": "thumbnail_url",
      "optimizedFileUrl": "optimized_file_url",
      "isOptimized": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

#### Get User Media

- **URL:** `/api/external/media`
- **Method:** `GET`
- **Access:** API Key
- **Description:** Get all media files for a user via external API.
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Number of items per page (default: 10)
  - `fileType` (optional): Filter by file type (e.g., `image`, `video`)
- **Response:**
  ```json
  {
    "success": true,
    "count": 10,
    "total": 100,
    "page": 1,
    "pages": 10,
    "media": [
      {
        "id": "media_id",
        "fileName": "file_name",
        "originalFileName": "original_file_name",
        "fileType": "file_type",
        "fileSize": 12345,
        "fileUrl": "file_url",
        "thumbnailUrl": "thumbnail_url",
        "optimizedFileUrl": "optimized_file_url",
        "isOptimized": true,
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### Get Media by ID

- **URL:** `/api/external/media/:id`
- **Method:** `GET`
- **Access:** API Key
- **Description:** Get a media file by ID via external API.
- **Response:**
  ```json
  {
    "success": true,
    "media": {
      "id": "media_id",
      "fileName": "file_name",
      "originalFileName": "original_file_name",
      "fileType": "file_type",
      "fileSize": 12345,
      "fileUrl": "file_url",
      "thumbnailUrl": "thumbnail_url",
      "optimizedFileUrl": "optimized_file_url",
      "isOptimized": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

#### Delete Media

- **URL:** `/api/external/media/:id`
- **Method:** `DELETE`
- **Access:** API Key
- **Description:** Delete a media file via external API.
- **Response:**
  ```json
  {
    "success": true,
    "message": "Media deleted successfully",
    "id": "media_id"
  }
  ```

## License

This project is licensed under the MIT License.