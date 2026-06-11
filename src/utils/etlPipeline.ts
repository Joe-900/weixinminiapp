/**
 * @file ETL数据管道 - 实现从爬虫到前端的自动化数据同步
 */

import { bookFieldMapping, reservationFieldMapping, transformData } from './fieldMapping';
import { validateBook, validateReservation, generateValidationReport } from './dataValidator';
import type { Book, Reservation } from '../types/reservation';
export interface EtlConfig {
 batchSize: number;
 retryCount: number;
 retryDelay: number;
 validateBeforeLoad: boolean;
 logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export interface EtlResult {
 success: boolean;
 totalRecords: number;
 processedRecords: number;
 successRecords: number;
 failedRecords: number;
 errors: EtlError[];
 warnings: EtlWarning[];
 validationReport?: string;
}
export interface EtlError {
 recordIndex: number;
 field: string;
 message: string;
 rawData?: unknown;
}
export interface EtlWarning {
 recordIndex: number;
 field: string;
 message: string;
}
export interface CrawlerRawData {
 books: Record<string, unknown>[];
 reservations: Record<string, unknown>[];
}
const defaultConfig: EtlConfig = {
 batchSize: 50,
 retryCount: 3,
 retryDelay: 1000,
 validateBeforeLoad: true,
 logLevel: 'info'
};
function log(level: EtlConfig['logLevel'], message: string, data?: unknown) {
 const levels = ['debug', 'info', 'warn', 'error'];
 if (levels.indexOf(level) >= levels.indexOf(defaultConfig.logLevel)) {
 console[level](`[ETL] ${message}`, data);
 }
}
export async function extractFromCrawler(url: string): Promise<CrawlerRawData> {
 log('info', `开始从爬虫获取数据: ${url}`);
 try {
 const response = await fetch(url);
 const data = await response.json();
 log('info', '成功从爬虫获取数据');
 return data;
 }
 catch (error) {
 log('error', `从爬虫获取数据失败: ${error}`);
 throw new Error(`ETL提取失败: ${error}`);
 }
}
export function transformBooks(rawBooks: Record<string, unknown>[]): {
 books: Book[];
 errors: EtlError[];
 warnings: EtlWarning[];
} {
 const books: Book[] = [];
 const errors: EtlError[] = [];
 const warnings: EtlWarning[] = [];
 rawBooks.forEach((rawBook, index) => {
 try {
 const transformed = transformData<Book>(rawBook, bookFieldMapping);
 if (defaultConfig.validateBeforeLoad) {
 const validation = validateBook(transformed);
 validation.errors.forEach(err => {
 errors.push({
 recordIndex: index,
 field: err.field,
 message: err.message,
 rawData: rawBook
 });
 });
 validation.warnings.forEach(warn => {
 warnings.push({
 recordIndex: index,
 field: warn.field,
 message: warn.message
 });
 });
 if (validation.isValid) {
 books.push(transformed as Book);
 }
 }
 else {
 books.push(transformed as Book);
 }
 }
 catch (error) {
 errors.push({
 recordIndex: index,
 field: 'transform',
 message: `转换失败: ${error}`
 });
 }
 });
 log('info', `图书数据转换完成: ${books.length} 成功, ${errors.length} 失败, ${warnings.length} 警告`);
 return { books, errors, warnings };
}
export function transformReservations(rawReservations: Record<string, unknown>[]): {
 reservations: Reservation[];
 errors: EtlError[];
 warnings: EtlWarning[];
} {
 const reservations: Reservation[] = [];
 const errors: EtlError[] = [];
 const warnings: EtlWarning[] = [];
 rawReservations.forEach((rawReservation, index) => {
 try {
 const transformed = transformData<Reservation>(rawReservation, reservationFieldMapping);
 if (defaultConfig.validateBeforeLoad) {
 const validation = validateReservation(transformed);
 validation.errors.forEach(err => {
 errors.push({
 recordIndex: index,
 field: err.field,
 message: err.message,
 rawData: rawReservation
 });
 });
 validation.warnings.forEach(warn => {
 warnings.push({
 recordIndex: index,
 field: warn.field,
 message: warn.message
 });
 });
 if (validation.isValid) {
 reservations.push(transformed as Reservation);
 }
 }
 else {
 reservations.push(transformed as Reservation);
 }
 }
 catch (error) {
 errors.push({
 recordIndex: index,
 field: 'transform',
 message: `转换失败: ${error}`
 });
 }
 });
 log('info', `预约数据转换完成: ${reservations.length} 成功, ${errors.length} 失败, ${warnings.length} 警告`);
 return { reservations, errors, warnings };
}
export function loadBooks(books: Book[], storage: BookStorage): Promise<void> {
 log('info', `开始加载 ${books.length} 本图书数据`);
 return storage.saveBooks(books);
}
export function loadReservations(reservations: Reservation[], storage: ReservationStorage): Promise<void> {
 log('info', `开始加载 ${reservations.length} 条预约数据`);
 return storage.saveReservations(reservations);
}
export interface BookStorage {
 saveBooks(books: Book[]): Promise<void>;
 getBooks(): Promise<Book[]>;
 clearBooks(): Promise<void>;
}
export interface ReservationStorage {
 saveReservations(reservations: Reservation[]): Promise<void>;
 getReservations(): Promise<Reservation[]>;
 clearReservations(): Promise<void>;
}
export class MemoryBookStorage implements BookStorage {
 private books: Book[] = [];
 async saveBooks(books: Book[]): Promise<void> {
 this.books = [...this.books, ...books];
 log('debug', `内存存储: 保存了 ${books.length} 本图书`);
 }
 async getBooks(): Promise<Book[]> {
 return this.books;
 }
 async clearBooks(): Promise<void> {
 this.books = [];
 log('debug', '内存存储: 已清空图书数据');
 }
}
export class MemoryReservationStorage implements ReservationStorage {
 private reservations: Reservation[] = [];
 async saveReservations(reservations: Reservation[]): Promise<void> {
 this.reservations = [...this.reservations, ...reservations];
 log('debug', `内存存储: 保存了 ${reservations.length} 条预约`);
 }
 async getReservations(): Promise<Reservation[]> {
 return this.reservations;
 }
 async clearReservations(): Promise<void> {
 this.reservations = [];
 log('debug', '内存存储: 已清空预约数据');
 }
}
export async function runEtlPipeline(config: Partial<EtlConfig> = {}, storage?: {
 bookStorage: BookStorage;
 reservationStorage: ReservationStorage;
}): Promise<EtlResult> {
 const mergedConfig = { ...defaultConfig, ...config };
 const bookStorage = storage?.bookStorage || new MemoryBookStorage();
 const reservationStorage = storage?.reservationStorage || new MemoryReservationStorage();
 const result: EtlResult = {
 success: true,
 totalRecords: 0,
 processedRecords: 0,
 successRecords: 0,
 failedRecords: 0,
 errors: [],
 warnings: []
 };
 log('info', '========== ETL管道开始执行 ==========');
 try {
 log('info', '阶段1: 数据抽取');
 const rawData = await extractFromCrawler('https://api.example.com/crawler/data');
 result.totalRecords = rawData.books.length + rawData.reservations.length;
 log('info', '阶段2: 图书数据转换');
 const bookTransform = transformBooks(rawData.books);
 result.errors.push(...bookTransform.errors);
 result.warnings.push(...bookTransform.warnings);
 result.processedRecords += rawData.books.length;
 result.successRecords += bookTransform.books.length;
 result.failedRecords += bookTransform.errors.length;
 log('info', '阶段3: 预约数据转换');
 const reservationTransform = transformReservations(rawData.reservations);
 result.errors.push(...reservationTransform.errors);
 result.warnings.push(...reservationTransform.warnings);
 result.processedRecords += rawData.reservations.length;
 result.successRecords += reservationTransform.reservations.length;
 result.failedRecords += reservationTransform.errors.length;
 log('info', '阶段4: 数据加载');
 await loadBooks(bookTransform.books, bookStorage);
 await loadReservations(reservationTransform.reservations, reservationStorage);
 log('info', '阶段5: 生成校验报告');
 const allBooks = await bookStorage.getBooks();
 const allReservations = await reservationStorage.getReservations();
 const bookResults = allBooks.map(validateBook);
 const reservationResults = allReservations.map(validateReservation);
 const bookReport = generateValidationReport(bookResults, '图书');
 const reservationReport = generateValidationReport(reservationResults, '预约');
 result.validationReport = `\n${bookReport}\n\n${reservationReport}`;
 log('info', '========== ETL管道执行完成 ==========');
 log('info', `总记录数: ${result.totalRecords}`);
 log('info', `处理记录数: ${result.processedRecords}`);
 log('info', `成功记录数: ${result.successRecords}`);
 log('info', `失败记录数: ${result.failedRecords}`);
 if (result.errors.length > 0) {
 log('warn', `存在 ${result.errors.length} 个错误`);
 result.success = false;
 }
 }
 catch (error) {
 log('error', `ETL管道执行失败: ${error}`);
 result.success = false;
 result.errors.push({
 recordIndex: -1,
 field: 'pipeline',
 message: `管道执行失败: ${error}`
 });
 }
 return result;
}
export async function runEtlWithRetry(config: Partial<EtlConfig> = {}, maxRetries: number = 3): Promise<EtlResult> {
 let lastError: Error | null = null;
 for (let attempt = 1; attempt <= maxRetries; attempt++) {
 try {
 log('info', `ETL管道第 ${attempt}/${maxRetries} 次尝试`);
 const result = await runEtlPipeline(config);
 if (result.success) {
 return result;
 }
 if (result.errors.some(e => e.field === 'pipeline')) {
 throw new Error('管道级错误，需要重试');
 }
 return result;
 }
 catch (error) {
 lastError = error as Error;
 log('warn', `ETL管道第 ${attempt} 次尝试失败: ${error}`);
 if (attempt < maxRetries) {
 log('info', `等待 ${defaultConfig.retryDelay}ms 后重试`);
 await new Promise(resolve => setTimeout(resolve, defaultConfig.retryDelay));
 }
 }
 }
 throw lastError || new Error('ETL管道所有重试均失败');
}