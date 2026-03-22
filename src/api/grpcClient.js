import protobuf from 'protobufjs';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

// Hàm đóng gói dữ liệu theo chuẩn gRPC-Web (5 byte header + data)
const frameRequest = (buffer) => {
    const frame = new Uint8Array(5 + buffer.length);
    frame[0] = 0; // Flag: 0 cho dữ liệu, 1 cho trailer
    const len = buffer.length;
    // Ghi độ dài vào 4 byte tiếp theo (Big-endian)
    frame[1] = (len >> 24) & 0xFF; 
    frame[2] = (len >> 16) & 0xFF;
    frame[3] = (len >> 8) & 0xFF; 
    frame[4] = len & 0xFF;
    frame.set(buffer, 5);
    return frame;
};

let rootCache = null;

// Hàm khởi tạo Proto duy nhất một lần để Benchmark chính xác
async function getRoot() {
    if (!rootCache) {
        rootCache = await protobuf.load("/book.proto");
        if (!rootCache) {
            throw new Error("Không thể tải file book.proto");
        }
    }
    return rootCache;
}

export const grpcApi = {
    // 1. Lấy danh sách sách (Benchmark mục tiêu chính)
    getAllBooks: async () => {
        const root = await getRoot();
        const RequestType = root.lookupType("EmptyRequest");
        const ResponseType = root.lookupType("BookList");

        const buffer = RequestType.encode(RequestType.create({})).finish();
        
        const response = await fetch(`${BASE_URL}/BookGrpc/GetAllBooks`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/grpc-web+proto', 
                'X-Grpc-Web': '1' 
            },
            body: frameRequest(buffer)
        });

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Đọc độ dài từ header để cắt dữ liệu chính xác, tránh lẫn Trailer Frame
        const messageLength = (uint8Array[1] << 24) | (uint8Array[2] << 16) | (uint8Array[3] << 8) | uint8Array[4];
        const actualData = uint8Array.slice(5, 5 + messageLength);

        const message = ResponseType.decode(actualData);
        return ResponseType.toObject(message, { defaults: true });
    },

    // 2. Thêm sách mới
    createBook: async (bookDto, imageUrl) => {
        const root = await getRoot();
        const RequestType = root.lookupType("CreateBookRequest");

        const payload = {
            title: bookDto.title,
            author: bookDto.author,
            price: Math.floor(Number(bookDto.price)), // Đảm bảo kiểu int32 cho Backend
            imageUrl: imageUrl
        };

        const message = RequestType.create(payload);
        const buffer = RequestType.encode(message).finish();

        const response = await fetch(`${BASE_URL}/BookGrpc/CreateBook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/grpc-web+proto',
                'X-Grpc-Web': '1'
            },
            body: frameRequest(buffer)
        });

        // Kiểm tra gRPC status từ header
        const grpcStatus = response.headers.get("grpc-status");
        if (grpcStatus && grpcStatus !== "0") {
            const grpcMessage = response.headers.get("grpc-message");
            throw new Error(`gRPC Error: ${grpcMessage}`);
        }

        return response;
    },

    // 3. Xóa sách
    deleteBook: async (id) => {
        const root = await getRoot();
        const DeleteRequest = root.lookupType("DeleteRequest");
        const buffer = DeleteRequest.encode({ id }).finish();

        return fetch(`${BASE_URL}/BookGrpc/DeleteBook`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/grpc-web+proto', 
                'X-Grpc-Web': '1' 
            },
            body: frameRequest(buffer)
        });
    }
};