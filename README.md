# User Management - CI/CD Docker Exercise

Repo này đã được bổ sung phần code theo bài thực hành CI/CD với Docker và GitHub Actions:

- `Dockerfile`: build Docker image cho ứng dụng Node.js hiện tại.
- `.dockerignore`: loại bỏ các file không cần thiết khi build image.
- `.github/workflows/cicd-docker.yml`: tự động build và push Docker image khi có commit lên nhánh `main`.
- `.gitignore`: bỏ qua `.env` để không commit thông tin nhạy cảm.

## Chạy project ở local

1. Cài dependencies:

```bash
npm install
```

2. Tạo file `.env` ở thư mục gốc và khai báo MongoDB URI:

```bash
MONGO_URI=mongodb://localhost:27017/user-management
PORT=3001
```

3. Chạy server:

```bash
npm start
```

API chạy tại `http://localhost:3001`.
Swagger docs chạy tại `http://localhost:3001/api-docs`.

## Kiểm tra Docker ở local

1. Build image:

```bash
docker build -t user-management:staging .
```

2. Chạy container:

```bash
docker run --env-file .env -p 3001:3001 user-management:staging
```

3. Mở `http://localhost:3001/api/health` để kiểm tra API.

## Các việc cần làm tiếp theo theo file bài tập

1. Tạo hoặc đăng nhập tài khoản GitHub.

2. Tạo hoặc đăng nhập tài khoản Docker Hub tại `https://hub.docker.com/`.

3. Push repo hiện tại lên GitHub:

```bash
git add .
git commit -m "Add Dockerfile and CI/CD workflow"
git push origin main
```

4. Vào repository trên GitHub, mở tab `Actions` để quan sát workflow chạy. Lần đầu workflow có thể lỗi vì chưa cấu hình Docker Hub secrets.

5. Tạo Docker Hub access token:

- Vào Docker Hub.
- Mở `Account Settings` -> `Personal access tokens`.
- Tạo token mới với quyền `Read, Write, Delete`.
- Copy token vừa tạo.

6. Cấu hình GitHub Secrets:

- Vào GitHub repository.
- Mở `Settings` -> `Secrets and variables` -> `Actions`.
- Chọn `New repository secret`.
- Tạo 2 secrets:

| Name | Giá trị |
| --- | --- |
| `DOCKERHUB_USERNAME` | Tên tài khoản Docker Hub của bạn |
| `DOCKERHUB_TOKEN` | Access token Docker Hub vừa tạo |

7. Commit một thay đổi nhỏ và push lại để kích hoạt workflow:

```bash
git add .
git commit -m "Trigger Docker CI/CD workflow"
git push origin main
```

8. Kiểm tra kết quả:

- Vào tab `Actions` trên GitHub để xem workflow build/push thành công hay chưa.
- Vào Docker Hub để kiểm tra image đã được tạo với tag dạng:

```text
<dockerhub-username>/user-management:staging
```

## Ghi chú về phần deploy

File bài tập có minh họa bước deploy qua SSH tới server, nhưng chưa yêu cầu có server thật. Vì vậy workflow hiện tại chỉ thực hiện phần CI/CD bắt buộc là build và push Docker image lên Docker Hub. Khi có server, bạn có thể bổ sung thêm job deploy và tạo các secrets:

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_SSH_KEY`
