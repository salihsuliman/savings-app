# Savings App

A React Native (Expo) savings application with a Node.js backend using the Plaid api.

## Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Docker](https://www.docker.com/)
- [Redis](https://redis.io/) (Running in Docker)

### Installation

1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd <repo-folder>
   ```

2. Install dependencies for both frontend and backend:
   ```sh
   cd savings
   npm install
   ```
   ```sh
   cd ../backend
   npm install
   ```

3. Start Redis in Docker:
   ```sh
   docker run --name redis -d -p 6379:6379 redis
   ```

### Running the App

#### Backend
Navigate to the backend folder and start the necessary files:
```sh
cd backend
npm start
```
Make sure `index.ts` and `webhook.ts` in the `src` folder are running.

#### Frontend
Navigate to the savings folder and start the Expo app:
```sh
cd savings
npm start
```
Follow the Expo instructions to run the app on an emulator or physical device.

## Notes
- Ensure Redis is running before starting the backend.
- The backend and frontend communicate over API endpoints, so make sure the server is running properly before using the app.

## License
This project is licensed under [MIT License](LICENSE).

