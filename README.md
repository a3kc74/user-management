# User Management - Triển khai Backend Render, Frontend Firebase và CI/CD Docker

## 1. Mục tiêu

Dự án thực hiện các nội dung:

- Xây dựng backend Node.js/Express kết nối MongoDB.
- Triển khai backend lên Render.
- Triển khai frontend tĩnh lên Firebase Hosting.
- Cấu hình frontend gọi API backend thông qua biến môi trường.
- Tạo Dockerfile cho backend.
- Cấu hình GitHub Actions để build và push Docker image lên Docker Hub.

## 2. Cấu trúc chính

```text
user-management/
├── index.html
├── server.js
├── package.json
├── package-lock.json
├── Dockerfile
├── .dockerignore
├── .env.example
├── firebase.json
├── scripts/
│   └── build-frontend.js
└── .github/
    └── workflows/
        └── cicd-docker.yml
```

## 3. Chuẩn bị môi trường

Cài dependencies:

```bash
npm install
```

Tạo file `.env` từ file mẫu:

```bash
cp .env.example .env
```

Cấu hình `.env`:

```env
MONGO_URI=mongodb://localhost:27017/user-management
PORT=3001
FRONTEND_API_BASE_URL=http://localhost:3001
```

Trong môi trường deploy thật, `FRONTEND_API_BASE_URL` được đổi thành URL backend Render:

```env
FRONTEND_API_BASE_URL=https://your-service-name.onrender.com
```

## 4. Chạy hệ thống ở local

Chạy backend:

```bash
npm start
```

Kiểm tra backend:

```bash
curl http://localhost:3001/api/health
```

Build frontend theo biến môi trường trong `.env`:

```bash
npm run build:frontend
```

Kiểm tra URL backend đã được nhúng vào frontend:

```bash
grep "CONFIGURED_API_BASE" dist/index.html
```

## 5. Deploy backend lên Render

Tạo Web Service trên Render và kết nối với repository GitHub.

Cấu hình service:

| Mục | Giá trị |
| --- | --- |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |

Cấu hình biến môi trường trên Render:

| Name | Giá trị |
| --- | --- |
| `MONGO_URI` | MongoDB connection string |

Không cần cấu hình `PORT` trên Render vì Render tự cấp qua `process.env.PORT`.

Sau khi deploy, kiểm tra backend:

```bash
curl https://your-service-name.onrender.com/api/health
```

Kết quả mong đợi:

```json
{
  "api": "ok",
  "dbConnected": true,
  "mongoReadyState": 1
}
```

## 6. Deploy frontend lên Firebase Hosting

Cài Firebase CLI:

```bash
npm install -g firebase-tools
```

Đăng nhập Firebase:

```bash
firebase login
```

Chọn project Firebase:

```bash
firebase use it4490-crud-20230043-f8d6b
```

Cập nhật `.env` để frontend gọi backend Render:

```env
FRONTEND_API_BASE_URL=https://your-service-name.onrender.com
```

Build frontend:

```bash
npm run build:frontend
```

Kiểm tra file build:

```bash
grep "CONFIGURED_API_BASE" dist/index.html
```

Deploy Firebase Hosting:

```bash
firebase deploy --only hosting
```

Có thể build và deploy bằng một lệnh:

```bash
npm run deploy:firebase
```

Kiểm tra trang frontend:

```text
https://it4490-crud-20230043-f8d6b.web.app
```

## 7. Kiểm tra Docker ở local

Build Docker image:

```bash
docker build -t user-management:staging .
```

Chạy container:

```bash
docker run --env-file .env -p 3001:3001 user-management:staging
```

Kiểm tra API trong container:

```bash
curl http://localhost:3001/api/health
```

## 8. Cấu hình CI/CD với GitHub Actions và Docker Hub

Push source code lên GitHub:

```bash
git add .
git commit -m "Add Dockerfile and CI/CD workflow"
git push origin main
```

Tạo Docker Hub access token:

```text
Docker Hub -> Account Settings -> Personal access tokens -> Generate token
```

Cấu hình GitHub Repository Secrets:

```text
GitHub repository -> Settings -> Secrets and variables -> Actions -> New repository secret
```

Tạo các secrets:

| Name | Giá trị |
| --- | --- |
| `DOCKERHUB_USERNAME` | Tên tài khoản Docker Hub |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

Kích hoạt lại workflow bằng một commit mới:

```bash
git add .
git commit -m "Trigger Docker workflow"
git push origin main
```

Kiểm tra workflow:

```text
GitHub repository -> Actions -> CI/CD and Docker
```

Kiểm tra image trên Docker Hub:

```text
<dockerhub-username>/user-management:staging
```

## 9. Các endpoint kiểm tra

Health check:

```text
GET /api/health
```

Danh sách người dùng:

```text
GET /api/users?page=1&limit=5&search=
```

Swagger UI:

```text
GET /api-docs
```

## 10. Ghi chú triển khai

- File `.env` không được commit lên GitHub.
- Firebase Hosting deploy thư mục `dist`.
- Script `npm run build:frontend` đọc `FRONTEND_API_BASE_URL` từ `.env` và nhúng vào `dist/index.html`.
- Khi thay đổi URL backend, cần chạy lại `npm run build:frontend` và deploy lại Firebase Hosting.
- Workflow GitHub Actions hiện thực hiện build và push Docker image, chưa thực hiện SSH deploy lên server riêng.
