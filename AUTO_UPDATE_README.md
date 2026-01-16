# Tính năng Auto-Update cho LuuGMail Desktop

## Tổng quan

Tính năng auto-update đã được tích hợp vào ứng dụng LuuGMail Desktop với các thành phần sau:

### 📁 Cấu trúc file

```
src/
├── services/
│   └── updateService.js      # Service xử lý auto-update
├── components/
│   ├── UpdateDialog.tsx      # Dialog hiển thị thông báo cập nhật
│   └── App.tsx               # Wrapper component cho toàn bộ app
├── hooks/
│   └── useUpdateManager.ts   # Hook quản lý state và logic update
├── types/
│   └── electron.d.ts         # TypeScript definitions
└── preload.js                # Preload script cho IPC
```

## ⚙️ Cấu hình

### 1. Cập nhật GitHub Repository

Trong file `src/services/updateService.js`, thay đổi các thông tin sau:

```javascript
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-username',        // Thay bằng GitHub username của bạn
  repo: 'luugmail-desktop'       // Thay bằng repo name của bạn
});
```

Trong file `package.json`, cập nhật section `publish`:

```json
"publish": {
  "provider": "github",
  "owner": "your-username",      // Thay bằng GitHub username của bạn
  "repo": "luugmail-desktop",    // Thay bằng repo name của bạn
  "private": false,
  "releaseType": "release"
}
```

### 2. Tạo GitHub Personal Access Token

1. Vào GitHub Settings → Developer settings → Personal access tokens
2. Tạo token mới với quyền `repo`
3. Set environment variable:
   ```bash
   export GH_TOKEN="your_token_here"
   ```

## 🚀 Sử dụng

### Build và Release

1. **Tăng version trong package.json:**
   ```json
   "version": "1.0.1"
   ```

2. **Build ứng dụng:**
   ```bash
   npm run dist:win    # Cho Windows
   npm run dist:mac    # Cho macOS  
   npm run dist:linux  # Cho Linux
   ```

3. **Tạo release trên GitHub:**
   ```bash
   npm run publish
   ```

### Quy trình hoạt động

1. **Khởi động ứng dụng:** Tự động kiểm tra phiên bản mới
2. **Phát hiện phiên bản mới:** Hiển thị dialog như trong hình ảnh
3. **User click "Có":** Bắt đầu tải xuống với progress bar
4. **Tải xong:** Hiển thị dialog hỏi có muốn khởi động lại không
5. **Khởi động lại:** App tự cập nhật và restart

## 🎨 Giao diện

Dialog cập nhật bao gồm:
- Tiêu đề: "Có bản cập nhật mới!"
- Thông tin phiên bản hiện tại và mới nhất
- Progress bar khi tải xuống
- Nút "Có" và "Không"
- Tùy chọn xem changelog (nếu có)

## 🔧 Tùy chỉnh

### Thay đổi giao diện

Sửa file `src/components/UpdateDialog.tsx` để thay đổi:
- Màu sắc, font chữ
- Nội dung text
- Layout dialog

### Thay đổi logic

Sửa file `src/services/updateService.js` để:
- Thay đổi provider (GitHub, private server, etc.)
- Tùy chỉnh thông báo
- Thêm custom logic

## 🐛 Debug

Trong development mode:
- Mở DevTools để xem console logs
- Kiểm tra network requests
- Test với mock update server

## 📝 Lưu ý quan trọng

1. **Security:** Luôn sử dụng HTTPS cho update server
2. **Testing:** Test kỹ trên các môi trường khác nhau
3. **Backup:** Luôn backup trước khi release
4. **Version:** Tuân thủ semantic versioning (x.y.z)
5. **Changelog:** Luôn cập nhật changelog cho mỗi version

## 🚨 Troubleshooting

### Không nhận diện cập nhật mới
- Kiểm tra version trong package.json
- Đảm bảo GitHub repo được public
- Kiểm tra GH_TOKEN environment variable

### Lỗi tải xuống
- Kiểm tra kết nối internet
- Xác nhận file release tồn tại trên GitHub
- Kiểm tra file size và format

### Lỗi cài đặt
- Đảm bảo quyền admin trên Windows
- Kiểm tra disk space
- Tắt antivirus tạm thời

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console logs
2. Xem file logs trong thư mục ứng dụng
3. Report issue trên GitHub repository
