import type { Book, BookWithStatus, BorrowRecord, Student } from './libraryLogic.ts';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}

export async function fetchStudents(): Promise<{
  students: Student[];
  mode: 'postgres' | 'memory';
}> {
  return requestJson('/api/students');
}

export async function createStudent(input: Student): Promise<Student> {
  const data = await requestJson<{ student: Student }>('/api/students', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.student;
}

export async function fetchBooks(): Promise<{
  books: BookWithStatus[];
  mode: 'postgres' | 'memory';
}> {
  return requestJson('/api/books');
}

export async function createBook(input: Book): Promise<BookWithStatus> {
  const data = await requestJson<{ book: BookWithStatus }>('/api/books', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.book;
}

export async function fetchBorrows(): Promise<{
  borrows: BorrowRecord[];
  mode: 'postgres' | 'memory';
}> {
  return requestJson('/api/borrows');
}

export async function issueBorrow(input: {
  usn: number;
  book_id: number;
}): Promise<BorrowRecord> {
  const data = await requestJson<{ borrow: BorrowRecord }>('/api/borrows', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.borrow;
}

export async function returnBorrow(transactionId: number): Promise<BorrowRecord> {
  const data = await requestJson<{ borrow: BorrowRecord }>(
    `/api/borrows/${transactionId}/return`,
    {
      method: 'PATCH',
    }
  );
  return data.borrow;
}
