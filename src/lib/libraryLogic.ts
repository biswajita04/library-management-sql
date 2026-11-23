export type PortalRoute = '/student' | '/book' | '/borrowlist';

export interface Student {
  usn: number;
  name: string;
  department: string;
}

export interface Book {
  book_id: number;
  book_name: string;
  author: string;
}

export interface BookWithStatus extends Book {
  is_borrowed: boolean;
}

export interface BorrowRecord {
  transaction_id: number;
  usn: number;
  student_name: string;
  book_id: number;
  book_name: string;
  borrow_time: string;
  return_status: boolean;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function normalizePortalPath(pathname: string): PortalRoute {
  const cleaned = pathname.replace(/\/+$/, '').toLowerCase();
  if (cleaned === '/book') {
    return '/book';
  }
  if (cleaned === '/borrowlist') {
    return '/borrowlist';
  }
  return '/student';
}

export function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && value > 0 && value <= 2147483647) {
      return value;
    }
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 2147483647) {
      return parsed;
    }
  }
  return null;
}

export function validateStudentInput(raw: {
  usn?: unknown;
  name?: unknown;
  department?: unknown;
}): ValidationResult<Student> {
  const usn = parsePositiveInt(raw.usn);
  if (usn === null) {
    return { ok: false, error: 'USN must be a positive whole number.' };
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (name.length < 2 || name.length > 120) {
    return { ok: false, error: 'Student name must be between 2 and 120 characters.' };
  }

  const department = typeof raw.department === 'string' ? raw.department.trim() : '';
  if (department.length < 2 || department.length > 120) {
    return { ok: false, error: 'Department must be between 2 and 120 characters.' };
  }

  return { ok: true, data: { usn, name, department } };
}

export function validateBookInput(raw: {
  book_id?: unknown;
  book_name?: unknown;
  author?: unknown;
}): ValidationResult<Book> {
  const book_id = parsePositiveInt(raw.book_id);
  if (book_id === null) {
    return { ok: false, error: 'Book ID must be a positive whole number.' };
  }

  const book_name = typeof raw.book_name === 'string' ? raw.book_name.trim() : '';
  if (book_name.length < 1 || book_name.length > 200) {
    return { ok: false, error: 'Book name must be between 1 and 200 characters.' };
  }

  const author = typeof raw.author === 'string' ? raw.author.trim() : '';
  if (author.length < 2 || author.length > 140) {
    return { ok: false, error: 'Author name must be between 2 and 140 characters.' };
  }

  return { ok: true, data: { book_id, book_name, author } };
}

export function validateBorrowInput(raw: {
  usn?: unknown;
  book_id?: unknown;
}): ValidationResult<{ usn: number; book_id: number }> {
  const usn = parsePositiveInt(raw.usn);
  if (usn === null) {
    return { ok: false, error: 'Student USN must be a positive whole number.' };
  }

  const book_id = parsePositiveInt(raw.book_id);
  if (book_id === null) {
    return { ok: false, error: 'Book ID must be a positive whole number.' };
  }

  return { ok: true, data: { usn, book_id } };
}

export function computeBooksWithStatus(
  books: Book[],
  borrows: Array<{ book_id: number; return_status: boolean }>
): BookWithStatus[] {
  const activeBookIds = new Set<number>();
  for (const row of borrows) {
    if (!row.return_status) {
      activeBookIds.add(row.book_id);
    }
  }
  return books.map((book) => ({
    ...book,
    is_borrowed: activeBookIds.has(book.book_id),
  }));
}

export function filterStudents(students: Student[], query: string): Student[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return students;
  }
  return students.filter(
    (s) =>
      String(s.usn).includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
  );
}

export function filterBooks(
  books: BookWithStatus[],
  query: string,
  status: 'all' | 'available' | 'borrowed'
): BookWithStatus[] {
  const q = query.trim().toLowerCase();
  return books.filter((b) => {
    if (status === 'available' && b.is_borrowed) {
      return false;
    }
    if (status === 'borrowed' && !b.is_borrowed) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      String(b.book_id).includes(q) ||
      b.book_name.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  });
}

export function filterBorrows(
  borrows: BorrowRecord[],
  query: string,
  status: 'all' | 'pending' | 'returned'
): BorrowRecord[] {
  const q = query.trim().toLowerCase();
  return borrows.filter((r) => {
    if (status === 'pending' && r.return_status) {
      return false;
    }
    if (status === 'returned' && !r.return_status) {
      return false;
    }
    if (!q) {
      return true;
    }
    return (
      String(r.transaction_id).includes(q) ||
      String(r.usn).includes(q) ||
      r.student_name.toLowerCase().includes(q) ||
      r.book_name.toLowerCase().includes(q)
    );
  });
}

export function formatBorrowTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
