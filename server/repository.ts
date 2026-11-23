import pg from 'pg';
import type { Pool as PgPool } from 'pg';
import {
  computeBooksWithStatus,
  type Book,
  type BookWithStatus,
  type BorrowRecord,
  type Student,
} from '../src/lib/libraryLogic.ts';

const { Pool } = pg;

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export interface LibraryRepository {
  readonly mode: 'postgres' | 'memory';
  listStudents(): Promise<Student[]>;
  addStudent(input: Student): Promise<Student>;
  listBooks(): Promise<BookWithStatus[]>;
  addBook(input: Book): Promise<BookWithStatus>;
  listBorrows(): Promise<BorrowRecord[]>;
  issueBook(input: { usn: number; book_id: number }): Promise<BorrowRecord>;
  markReturned(transactionId: number): Promise<BorrowRecord>;
}

export class PgLibraryRepository implements LibraryRepository {
  readonly mode = 'postgres' as const;
  private pool: PgPool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  async listStudents(): Promise<Student[]> {
    const result = await this.pool.query<Student>(
      'SELECT usn, name, department FROM student ORDER BY usn ASC'
    );
    return result.rows;
  }

  async addStudent(input: Student): Promise<Student> {
    try {
      const result = await this.pool.query<Student>(
        'INSERT INTO student (usn, name, department) VALUES ($1, $2, $3) RETURNING usn, name, department',
        [input.usn, input.name, input.department]
      );
      return result.rows[0];
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new HttpError(409, `Student with USN ${input.usn} already exists.`);
      }
      throw err;
    }
  }

  async listBooks(): Promise<BookWithStatus[]> {
    const result = await this.pool.query<BookWithStatus>(
      `SELECT
        b.book_id,
        b.book_name,
        b.author,
        EXISTS (
          SELECT 1
          FROM borrow br
          WHERE br.book_id = b.book_id AND br.return_status = false
        ) AS is_borrowed
      FROM book b
      ORDER BY b.book_id ASC`
    );
    return result.rows;
  }

  async addBook(input: Book): Promise<BookWithStatus> {
    try {
      const result = await this.pool.query<Book>(
        'INSERT INTO book (book_id, book_name, author) VALUES ($1, $2, $3) RETURNING book_id, book_name, author',
        [input.book_id, input.book_name, input.author]
      );
      return { ...result.rows[0], is_borrowed: false };
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new HttpError(409, `Book with ID ${input.book_id} already exists.`);
      }
      throw err;
    }
  }

  async listBorrows(): Promise<BorrowRecord[]> {
    const result = await this.pool.query<
      Omit<BorrowRecord, 'borrow_time'> & { borrow_time: Date | string }
    >(
      `SELECT
        br.transaction_id,
        br.usn,
        s.name AS student_name,
        br.book_id,
        bk.book_name,
        br.borrow_time,
        br.return_status
      FROM borrow br
      JOIN student s ON br.usn = s.usn
      JOIN book bk ON br.book_id = bk.book_id
      ORDER BY br.transaction_id DESC`
    );
    return result.rows.map((row) => ({
      ...row,
      borrow_time:
        row.borrow_time instanceof Date
          ? row.borrow_time.toISOString()
          : String(row.borrow_time),
    }));
  }

  async issueBook(input: { usn: number; book_id: number }): Promise<BorrowRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const studentRes = await client.query<{ usn: number; name: string }>(
        'SELECT usn, name FROM student WHERE usn = $1',
        [input.usn]
      );
      if (studentRes.rowCount === 0) {
        throw new HttpError(404, `Student with USN ${input.usn} was not found.`);
      }

      const bookRes = await client.query<{ book_id: number; book_name: string }>(
        'SELECT book_id, book_name FROM book WHERE book_id = $1 FOR UPDATE',
        [input.book_id]
      );
      if (bookRes.rowCount === 0) {
        throw new HttpError(404, `Book with ID ${input.book_id} was not found.`);
      }

      const activeRes = await client.query<{ transaction_id: number }>(
        'SELECT transaction_id FROM borrow WHERE book_id = $1 AND return_status = false LIMIT 1',
        [input.book_id]
      );
      if ((activeRes.rowCount ?? 0) > 0) {
        throw new HttpError(
          409,
          `Book ID ${input.book_id} is currently borrowed and pending return.`
        );
      }

      const insertRes = await client.query<{
        transaction_id: number;
        usn: number;
        book_id: number;
        borrow_time: Date | string;
        return_status: boolean;
      }>(
        `INSERT INTO borrow (usn, book_id, borrow_time, return_status)
         VALUES ($1, $2, NOW(), false)
         RETURNING transaction_id, usn, book_id, borrow_time, return_status`,
        [input.usn, input.book_id]
      );

      await client.query('COMMIT');

      const inserted = insertRes.rows[0];
      return {
        transaction_id: inserted.transaction_id,
        usn: inserted.usn,
        student_name: studentRes.rows[0].name,
        book_id: inserted.book_id,
        book_name: bookRes.rows[0].book_name,
        borrow_time:
          inserted.borrow_time instanceof Date
            ? inserted.borrow_time.toISOString()
            : String(inserted.borrow_time),
        return_status: inserted.return_status,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async markReturned(transactionId: number): Promise<BorrowRecord> {
    const updated = await this.pool.query<{ transaction_id: number }>(
      'UPDATE borrow SET return_status = true WHERE transaction_id = $1 RETURNING transaction_id',
      [transactionId]
    );
    if (updated.rowCount === 0) {
      throw new HttpError(404, `Borrow transaction ${transactionId} was not found.`);
    }

    const joined = await this.pool.query<
      Omit<BorrowRecord, 'borrow_time'> & { borrow_time: Date | string }
    >(
      `SELECT
        br.transaction_id,
        br.usn,
        s.name AS student_name,
        br.book_id,
        bk.book_name,
        br.borrow_time,
        br.return_status
      FROM borrow br
      JOIN student s ON br.usn = s.usn
      JOIN book bk ON br.book_id = bk.book_id
      WHERE br.transaction_id = $1`,
      [transactionId]
    );

    const row = joined.rows[0];
    return {
      ...row,
      borrow_time:
        row.borrow_time instanceof Date
          ? row.borrow_time.toISOString()
          : String(row.borrow_time),
    };
  }
}

interface RawBorrowRow {
  transaction_id: number;
  usn: number;
  book_id: number;
  borrow_time: string;
  return_status: boolean;
}

export class MemoryLibraryRepository implements LibraryRepository {
  readonly mode = 'memory' as const;
  private students: Student[] = [
    { usn: 101, name: 'Aarav Mehta', department: 'Computer Science' },
    { usn: 102, name: 'Priya Nair', department: 'Electronics & Comm.' },
    { usn: 103, name: 'Daniel Brooks', department: 'Mechanical Eng.' },
    { usn: 104, name: 'Sofia Alvarez', department: 'Information Science' },
  ];

  private books: Book[] = [
    {
      book_id: 501,
      book_name: 'Database System Concepts',
      author: 'Abraham Silberschatz',
    },
    {
      book_id: 502,
      book_name: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
    },
    {
      book_id: 503,
      book_name: 'Computer Networks',
      author: 'Andrew S. Tanenbaum',
    },
    {
      book_id: 504,
      book_name: 'Operating Systems: Three Easy Pieces',
      author: 'Remzi Arpaci-Dusseau',
    },
  ];

  private borrows: RawBorrowRow[] = [
    {
      transaction_id: 1,
      usn: 101,
      book_id: 501,
      borrow_time: '2026-11-20T09:15:00.000Z',
      return_status: false,
    },
    {
      transaction_id: 2,
      usn: 102,
      book_id: 502,
      borrow_time: '2026-11-18T14:30:00.000Z',
      return_status: true,
    },
    {
      transaction_id: 3,
      usn: 104,
      book_id: 503,
      borrow_time: '2026-11-22T11:45:00.000Z',
      return_status: false,
    },
  ];

  private nextTransactionId = 4;

  async listStudents(): Promise<Student[]> {
    return [...this.students].sort((a, b) => a.usn - b.usn);
  }

  async addStudent(input: Student): Promise<Student> {
    if (this.students.some((s) => s.usn === input.usn)) {
      throw new HttpError(409, `Student with USN ${input.usn} already exists.`);
    }
    const created = { ...input };
    this.students.push(created);
    return created;
  }

  async listBooks(): Promise<BookWithStatus[]> {
    const sorted = [...this.books].sort((a, b) => a.book_id - b.book_id);
    return computeBooksWithStatus(sorted, this.borrows);
  }

  async addBook(input: Book): Promise<BookWithStatus> {
    if (this.books.some((b) => b.book_id === input.book_id)) {
      throw new HttpError(409, `Book with ID ${input.book_id} already exists.`);
    }
    const created = { ...input };
    this.books.push(created);
    return { ...created, is_borrowed: false };
  }

  private hydrateBorrow(row: RawBorrowRow): BorrowRecord {
    const student = this.students.find((s) => s.usn === row.usn);
    const book = this.books.find((b) => b.book_id === row.book_id);
    return {
      transaction_id: row.transaction_id,
      usn: row.usn,
      student_name: student ? student.name : `USN ${row.usn}`,
      book_id: row.book_id,
      book_name: book ? book.book_name : `Book ${row.book_id}`,
      borrow_time: row.borrow_time,
      return_status: row.return_status,
    };
  }

  async listBorrows(): Promise<BorrowRecord[]> {
    return [...this.borrows]
      .sort((a, b) => b.transaction_id - a.transaction_id)
      .map((row) => this.hydrateBorrow(row));
  }

  async issueBook(input: { usn: number; book_id: number }): Promise<BorrowRecord> {
    const student = this.students.find((s) => s.usn === input.usn);
    if (!student) {
      throw new HttpError(404, `Student with USN ${input.usn} was not found.`);
    }
    const book = this.books.find((b) => b.book_id === input.book_id);
    if (!book) {
      throw new HttpError(404, `Book with ID ${input.book_id} was not found.`);
    }
    const alreadyBorrowed = this.borrows.some(
      (row) => row.book_id === input.book_id && !row.return_status
    );
    if (alreadyBorrowed) {
      throw new HttpError(
        409,
        `Book ID ${input.book_id} is currently borrowed and pending return.`
      );
    }

    const row: RawBorrowRow = {
      transaction_id: this.nextTransactionId++,
      usn: input.usn,
      book_id: input.book_id,
      borrow_time: new Date().toISOString(),
      return_status: false,
    };
    this.borrows.push(row);
    return this.hydrateBorrow(row);
  }

  async markReturned(transactionId: number): Promise<BorrowRecord> {
    const row = this.borrows.find((r) => r.transaction_id === transactionId);
    if (!row) {
      throw new HttpError(404, `Borrow transaction ${transactionId} was not found.`);
    }
    row.return_status = true;
    return this.hydrateBorrow(row);
  }
}
