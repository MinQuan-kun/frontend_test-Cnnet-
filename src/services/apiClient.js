import axios from 'axios';
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';
import protobuf from 'protobufjs';


const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://localhost:7258";

const restClient = axios.create({
    baseURL: `${BASE_URL}/api`,
    timeout: 10000,
});

const graphqlClient = new ApolloClient({
    // Đảm bảo đường dẫn này chính xác với Backend (thường là /graphql)
    link: new HttpLink({
        uri: `${BASE_URL}/graphql`,
    }),
    cache: new InMemoryCache(),
});

export const createBookGraphQL = async (bookDto, imageUrl) => {
    // Định nghĩa chuỗi Query Mutation
    const CREATE_BOOK_MUTATION = gql`
        mutation Create($input: BookCreateDtoInput!, $url: String!) {
            createBook(input: $input, imageUrl: $url) {
                id
                title
                price
            }
        }
    `;

    const start = performance.now();

    const { data } = await graphqlClient.mutate({
        mutation: CREATE_BOOK_MUTATION,
        variables: {
            input: {
                title: bookDto.title,
                author: bookDto.author,
                price: bookDto.price
            },
            url: imageUrl
        }
    });

    const duration = performance.now() - start;
    return { data: data.createBook, duration };
};

export const createBookGRPC = async (bookDto, imageUrl) => {
    // 1. Tải cấu trúc từ file .proto trong thư mục public
    const root = await protobuf.load("/book.proto");
    const CreateRequest = root.lookupType("GK_CNNET.CreateBookRequest");

    // 2. Tạo Payload nhị phân
    const payload = {
        title: bookDto.title,
        author: bookDto.author,
        price: Math.floor(Number(bookDto.price)) || 0,
        imageUrl: imageUrl
    };

    // Kiểm tra tính hợp lệ và Encode sang Uint8Array (Binary)
    const errMsg = CreateRequest.verify(payload);
    if (errMsg) throw Error(errMsg);
    const buffer = CreateRequest.encode(CreateRequest.create(payload)).finish();

    const start = performance.now();

    // 3. Gửi request gRPC-Web (dùng fetch với mode nhị phân)
    const response = await fetch(`${BASE_URL}/GK_CNNET.BookGrpc/CreateBook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/grpc-web+proto', // Chuẩn nhị phân
            'X-Grpc-Web': '1'
        },
        body: buffer
    });

    const duration = performance.now() - start;
    return { success: response.ok, duration };
};

export const runBenchmark = async (type) => {
    const start = performance.now();
    try {
        if (type === 'REST') {
            await restClient.get('/books');
        }
        else if (type === 'GraphQL') {
            await graphqlClient.query({
                query: gql`query { books { id title author } }`,
                fetchPolicy: 'no-cache'
            });
        }
        else if (type === 'gRPC') {
            const root = await protobuf.load("/book.proto");
            const EmptyRequest = root.lookupType("GK_CNNET.EmptyRequest");
            // Encode một request trống (0 bytes dữ liệu nhưng vẫn cần 5 bytes frame)
            const framedPayload = frameRequest(EmptyRequest.encode({}).finish());

            await fetch(`${BASE_URL}/GK_CNNET.BookGrpc/GetAllBooks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/grpc-web+proto',
                    'X-Grpc-Web': '1'
                },
                body: framedPayload
            });
        }

        return performance.now() - start;
    } catch (error) {
        console.error(`Error testing ${type}:`, error);
        return 0;
    }
};

// Xuất thêm restClient để dùng cho CRUD trong App.jsx
export { restClient };