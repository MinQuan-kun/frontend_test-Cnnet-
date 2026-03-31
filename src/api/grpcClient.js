import protobuf from 'protobufjs';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

// Hàm đóng gói dữ liệu theo chuẩn gRPC-Web (5 byte header + data)
const frameRequest = (buffer) => {
    const frame = new Uint8Array(5 + buffer.length);
    frame[0] = 0;
    const len = buffer.length;
    frame[1] = (len >> 24) & 0xFF; 
    frame[2] = (len >> 16) & 0xFF;
    frame[3] = (len >> 8) & 0xFF; 
    frame[4] = len & 0xFF;
    frame.set(buffer, 5);
    return frame;
};

let rootCache = null;

async function getRoot() {
    if (!rootCache) {
        rootCache = await protobuf.load("/game.proto");
        if (!rootCache) {
            throw new Error("Không thể tải file game.proto");
        }
    }
    return rootCache;
}

export const grpcApi = {
    // 1. Lấy danh sách game
    getAllGames: async () => {
        const root = await getRoot();
        const RequestType = root.lookupType("EmptyRequest");
        const ResponseType = root.lookupType("GameList");

        const buffer = RequestType.encode(RequestType.create({})).finish();
        
        const response = await fetch(`${BASE_URL}/GameGrpc/GetAllGames`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/grpc-web+proto', 
                'X-Grpc-Web': '1' 
            },
            body: frameRequest(buffer)
        });

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const messageLength = (uint8Array[1] << 24) | (uint8Array[2] << 16) | (uint8Array[3] << 8) | uint8Array[4];
        const actualData = uint8Array.slice(5, 5 + messageLength);

        const message = ResponseType.decode(actualData);
        return ResponseType.toObject(message, { defaults: true });
    },

    // 2. Thêm game mới
    createGame: async (gameDto, imageUrl) => {
        const root = await getRoot();
        const RequestType = root.lookupType("CreateGameRequest");

        const payload = {
            name: gameDto.name,
            genre: gameDto.genre,
            price: Math.floor(Number(gameDto.price)),
            imageUrl: imageUrl,
            platform: gameDto.platform,
            description: gameDto.description,
            rating: parseFloat(gameDto.rating) || 0
        };

        const message = RequestType.create(payload);
        const buffer = RequestType.encode(message).finish();

        const response = await fetch(`${BASE_URL}/GameGrpc/CreateGame`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/grpc-web+proto',
                'X-Grpc-Web': '1'
            },
            body: frameRequest(buffer)
        });

        const grpcStatus = response.headers.get("grpc-status");
        if (grpcStatus && grpcStatus !== "0") {
            const grpcMessage = response.headers.get("grpc-message");
            throw new Error(`gRPC Error: ${grpcMessage}`);
        }

        return response;
    },

    // 3. Xóa game
    deleteGame: async (id) => {
        const root = await getRoot();
        const DeleteRequest = root.lookupType("DeleteRequest");
        const buffer = DeleteRequest.encode({ id }).finish();

        return fetch(`${BASE_URL}/GameGrpc/DeleteGame`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/grpc-web+proto', 
                'X-Grpc-Web': '1' 
            },
            body: frameRequest(buffer)
        });
    }
};