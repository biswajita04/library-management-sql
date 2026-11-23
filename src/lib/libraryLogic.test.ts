import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBooksWithStatus,
  filterBooks,
  filterBorrows,
  filterStudents,
  normalizePortalPath,
  parsePositiveInt,
  validateBookInput,
  validateBorrowInput,
  validateStudentInput,
} from './libraryLogic.ts';

test('normalizePortalPath maps root and valid portals accurately', () => {
  assert.equal(normalizePortalPath('/'), '/student');
  assert.equal(normalizePortalPath('/student'), '/student');
  assert.equal(normalizePortalPath('/student/'), '/student');
  assert.equal(normalizePortalPath('/book'), '/book');
  assert.equal(normalizePortalPath('/borrowlist'), '/borrowlist');
  assert.equal(normalizePortalPath('/unknown'), '/student');
});

test('parsePositiveInt validates integer bounds and rejects invalid input', () => {
  assert.equal(parsePositiveInt(101), 101);
  assert.equal(parsePositiveInt('204'), 204);
  assert.equal(parsePositiveInt(0), null);
  assert.equal(parsePositiveInt(-5), null);
  assert.equal(parsePositiveInt('12.5'), null);
  assert.equal(parsePositiveInt('abc'), null);
  assert.equal(parsePositiveInt(2147483648), null);
});

test('validateStudentInput enforces required fields and trims strings', () => {
  const valid = validateStudentInput({
    usn: '101',
    name: '  Aarav Mehta  ',
    department: ' Computer Science ',
  });
  assert.deepEqual(valid, {
    ok: true,
    data: { usn: 101, name: 'Aarav Mehta', department: 'Computer Science' },
  });

  const badUsn = validateStudentInput({ usn: '0', name: 'Aarav', department: 'CS' });
  assert.equal(badUsn.ok, false);

  const badName = validateStudentInput({ usn: 101, name: 'A', department: 'CS' });
  assert.equal(badName.ok, false);
});

test('validateBookInput and validateBorrowInput validate inputs cleanly', () => {
  const validBook = validateBookInput({
    book_id: 501,
    book_name: 'Operating System Concepts',
    author: 'Abraham Silberschatz',
  });
  assert.equal(validBook.ok, true);

  const missingAuthor = validateBookInput({
    book_id: 501,
    book_name: 'Operating System Concepts',
    author: '',
  });
  assert.equal(missingAuthor.ok, false);

  const validBorrow = validateBorrowInput({ usn: '101', book_id: '501' });
  assert.deepEqual(validBorrow, { ok: true, data: { usn: 101, book_id: 501 } });
});

test('computeBooksWithStatus marks books with return_status=false as borrowed', () => {
  const books = [
    { book_id: 1, book_name: 'Clean Code', author: 'Robert Martin' },
    { book_id: 2, book_name: 'SICP', author: 'Harold Abelson' },
    { book_id: 3, book_name: 'Compilers', author: 'Alfred Aho' },
  ];
  const borrows = [
    { book_id: 1, return_status: true },
    { book_id: 2, return_status: false },
  ];

  const result = computeBooksWithStatus(books, borrows);
  assert.equal(result[0].is_borrowed, false);
  assert.equal(result[1].is_borrowed, true);
  assert.equal(result[2].is_borrowed, false);
});

test('filter helpers filter students, books, and borrows by query and status', () => {
  const students = [
    { usn: 101, name: 'Aarav Mehta', department: 'CSE' },
    { usn: 102, name: 'Maya Lin', department: 'ECE' },
  ];
  assert.equal(filterStudents(students, 'ece').length, 1);
  assert.equal(filterStudents(students, '101').length, 1);

  const books = [
    { book_id: 501, book_name: 'Clean Code', author: 'Robert Martin', is_borrowed: true },
    { book_id: 502, book_name: 'SICP', author: 'Harold Abelson', is_borrowed: false },
  ];
  assert.equal(filterBooks(books, '', 'borrowed').length, 1);
  assert.equal(filterBooks(books, 'sicp', 'available').length, 1);
  assert.equal(filterBooks(books, 'sicp', 'borrowed').length, 0);

  const borrows = [
    {
      transaction_id: 1,
      usn: 101,
      student_name: 'Aarav Mehta',
      book_id: 501,
      book_name: 'Clean Code',
      borrow_time: '2026-11-22T10:00:00Z',
      return_status: false,
    },
    {
      transaction_id: 2,
      usn: 102,
      student_name: 'Maya Lin',
      book_id: 502,
      book_name: 'SICP',
      borrow_time: '2026-11-21T09:00:00Z',
      return_status: true,
    },
  ];
  assert.equal(filterBorrows(borrows, '', 'pending').length, 1);
  assert.equal(filterBorrows(borrows, 'maya', 'returned').length, 1);
});
