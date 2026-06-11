/**
 * @file 数据质量监控系统 - 实现异常自动告警
 */

import { validateBook, validateReservation, validateBooks, validateReservations, generateValidationReport } from './dataValidator'
import type { Book, Reservation } from '../types/reservation'

export interface MonitorConfig {
  checkInterval: number
  alertThreshold: number
  maxErrorsPerReport: number
  notificationCallback?: (alert: QualityAlert) => void
}

export interface QualityAlert {
  id: string
  type: AlertType
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  details: AlertDetail[]
  affectedRecords: number
}

export interface AlertDetail {
  field: string
  errorCount: number
  sampleErrors: string[]
}

export type AlertType = 
  | 'data_inconsistency'
  | 'validation_failure'
  | 'missing_required_field'
  | 'data_format_error'
  | 'business_rule_violation'
  | 'data_drift'
  | 'performance_degradation'

export interface QualityReport {
  reportId: string
  timestamp: number
  bookValidation: ValidationSummaryWithDetails
  reservationValidation: ValidationSummaryWithDetails
  alerts: QualityAlert[]
  overallScore: number
  status: 'pass' | 'warning' | 'fail'
}

export interface ValidationSummaryWithDetails {
  summary: {
    total: number
    valid: number
    invalid: number
    warningCount: number
    errorCount: number
  }
  errors: DetailedError[]
}

export interface DetailedError {
  field: string
  message: string
  recordIds: string[]
  count: number
}

const defaultConfig: MonitorConfig = {
  checkInterval: 3600000,
  alertThreshold: 5,
  maxErrorsPerReport: 100
}

export class DataQualityMonitor {
  private config: MonitorConfig
  private books: Book[] = []
  private reservations: Reservation[] = []
  private alertHistory: QualityAlert[] = []
  private checkTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  setData(books: Book[], reservations: Reservation[]) {
    this.books = books
    this.reservations = reservations
    console.log(`[QualityMonitor] 已更新监控数据: ${books.length} 本图书, ${reservations.length} 条预约`)
  }

  startMonitoring() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
    }
    
    this.checkTimer = setInterval(() => {
      this.performQualityCheck()
    }, this.config.checkInterval)

    console.log(`[QualityMonitor] 监控已启动，检查间隔: ${this.config.checkInterval}ms`)
    this.performQualityCheck()
  }

  stopMonitoring() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
    console.log('[QualityMonitor] 监控已停止')
  }

  async performQualityCheck(): Promise<QualityReport> {
    console.log('[QualityMonitor] 开始执行数据质量检查...')
    
    const report = await this.generateQualityReport()
    
    if (report.alerts.length > 0) {
      console.log(`[QualityMonitor] 发现 ${report.alerts.length} 个告警`)
      report.alerts.forEach(alert => {
        this.triggerAlert(alert)
      })
    }

    return report
  }

  async generateQualityReport(): Promise<QualityReport> {
    const reportId = `report_${Date.now()}`
    const alerts: QualityAlert[] = []

    const bookValidation = await this.validateBookData()
    const reservationValidation = await this.validateReservationData()

    const bookAlerts = this.generateAlertsFromValidation(
      '图书',
      bookValidation,
      bookValidation.summary.total
    )
    alerts.push(...bookAlerts)

    const reservationAlerts = this.generateAlertsFromValidation(
      '预约',
      reservationValidation,
      reservationValidation.summary.total
    )
    alerts.push(...reservationAlerts)

    const dataDriftAlerts = await this.detectDataDrift()
    alerts.push(...dataDriftAlerts)

    const overallScore = this.calculateOverallScore(bookValidation, reservationValidation)
    const status = this.determineStatus(overallScore, alerts)

    const report: QualityReport = {
      reportId,
      timestamp: Date.now(),
      bookValidation,
      reservationValidation,
      alerts,
      overallScore,
      status
    }

    return report
  }

  private async validateBookData(): Promise<ValidationSummaryWithDetails> {
    const { results, summary } = validateBooks(this.books)
    const errors = this.aggregateErrors(results, this.books)
    
    return { summary, errors }
  }

  private async validateReservationData(): Promise<ValidationSummaryWithDetails> {
    const { results, summary } = validateReservations(this.reservations)
    const errors = this.aggregateErrors(results, this.reservations)
    
    return { summary, errors }
  }

  private aggregateErrors<T extends { bookId?: string; reservationId?: string }>(
    results: { errors: { field: string; message: string }[] }[],
    data: T[]
  ): DetailedError[] {
    const errorMap = new Map<string, { messages: Set<string>; recordIds: Set<string> }>()

    results.forEach((result, index) => {
      result.errors.forEach(error => {
        const key = `${error.field}:${error.message}`
        const existing = errorMap.get(key) || { messages: new Set(), recordIds: new Set() }
        
        existing.messages.add(error.message)
        const recordId = data[index]?.bookId || data[index]?.reservationId || `record_${index}`
        existing.recordIds.add(recordId)
        
        errorMap.set(key, existing)
      })
    })

    return Array.from(errorMap.entries()).map(([key, value]) => ({
      field: key.split(':')[0],
      message: key.split(':').slice(1).join(':'),
      recordIds: Array.from(value.recordIds),
      count: value.recordIds.size
    }))
  }

  private generateAlertsFromValidation(
    dataType: string,
    validation: ValidationSummaryWithDetails,
    totalCount: number
  ): QualityAlert[] {
    const alerts: QualityAlert[] = []

    if (validation.summary.invalid > 0) {
      const severity = this.determineSeverity(
        validation.summary.invalid,
        totalCount
      )

      const details: AlertDetail[] = validation.errors
        .slice(0, this.config.maxErrorsPerReport)
        .map(error => ({
          field: error.field,
          errorCount: error.count,
          sampleErrors: [error.message]
        }))

      alerts.push({
        id: `${dataType.toLowerCase()}_validation_${Date.now()}`,
        type: 'validation_failure',
        severity,
        message: `${dataType}数据校验失败: ${validation.summary.invalid}/${totalCount} 条记录无效`,
        timestamp: Date.now(),
        details,
        affectedRecords: validation.summary.invalid
      })
    }

    if (validation.summary.errorCount > this.config.alertThreshold) {
      alerts.push({
        id: `${dataType.toLowerCase()}_errors_${Date.now()}`,
        type: 'data_inconsistency',
        severity: 'medium',
        message: `${dataType}数据存在大量错误: ${validation.summary.errorCount} 个错误`,
        timestamp: Date.now(),
        details: [],
        affectedRecords: validation.summary.errorCount
      })
    }

    return alerts
  }

  private async detectDataDrift(): Promise<QualityAlert[]> {
    const alerts: QualityAlert[] = []

    const campusDistribution = this.books.reduce((acc, book) => {
      acc[book.campus] = (acc[book.campus] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const campusThreshold = 0.1
    Object.entries(campusDistribution).forEach(([campus, count]) => {
      const percentage = count / this.books.length
      if (percentage < campusThreshold) {
        alerts.push({
          id: `campus_drift_${campus}_${Date.now()}`,
          type: 'data_drift',
          severity: 'low',
          message: `校区分布异常: ${campus} 占比仅 ${(percentage * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          details: [],
          affectedRecords: count
        })
      }
    })

    return alerts
  }

  private determineSeverity(invalidCount: number, totalCount: number): QualityAlert['severity'] {
    const ratio = invalidCount / totalCount
    
    if (ratio >= 0.5) return 'critical'
    if (ratio >= 0.2) return 'high'
    if (ratio >= 0.1) return 'medium'
    return 'low'
  }

  private calculateOverallScore(
    bookValidation: ValidationSummaryWithDetails,
    reservationValidation: ValidationSummaryWithDetails
  ): number {
    const totalRecords = bookValidation.summary.total + reservationValidation.summary.total
    const validRecords = bookValidation.summary.valid + reservationValidation.summary.valid
    
    if (totalRecords === 0) return 100
    
    return Math.round((validRecords / totalRecords) * 100)
  }

  private determineStatus(score: number, alerts: QualityAlert[]): QualityReport['status'] {
    if (score >= 95) return 'pass'
    if (score >= 80) return 'warning'
    
    const hasCritical = alerts.some(a => a.severity === 'critical')
    if (hasCritical) return 'fail'
    
    return score >= 60 ? 'warning' : 'fail'
  }

  private triggerAlert(alert: QualityAlert) {
    this.alertHistory.push(alert)
    
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100)
    }

    if (this.config.notificationCallback) {
      try {
        this.config.notificationCallback(alert)
      } catch (error) {
        console.error('[QualityMonitor] 告警回调执行失败:', error)
      }
    }

    switch (alert.severity) {
      case 'critical':
        console.error(`[QualityAlert CRITICAL] ${alert.message}`)
        break
      case 'high':
        console.error(`[QualityAlert HIGH] ${alert.message}`)
        break
      case 'medium':
        console.warn(`[QualityAlert MEDIUM] ${alert.message}`)
        break
      default:
        console.info(`[QualityAlert LOW] ${alert.message}`)
    }
  }

  getAlertHistory(): QualityAlert[] {
    return [...this.alertHistory]
  }

  getCurrentStatus(): {
    bookCount: number
    reservationCount: number
    lastCheckTime?: number
    activeAlerts: number
  } {
    const recentAlerts = this.alertHistory.filter(
      a => Date.now() - a.timestamp < this.config.checkInterval
    )

    return {
      bookCount: this.books.length,
      reservationCount: this.reservations.length,
      lastCheckTime: this.alertHistory[this.alertHistory.length - 1]?.timestamp,
      activeAlerts: recentAlerts.length
    }
  }

  generateSummaryReport(): string {
    const status = this.getCurrentStatus()
    
    let report = `=== 数据质量监控汇总报告 ===\n`
    report += `生成时间: ${new Date().toLocaleString()}\n`
    report += `监控图书数量: ${status.bookCount}\n`
    report += `监控预约数量: ${status.reservationCount}\n`
    
    if (status.lastCheckTime) {
      report += `上次检查时间: ${new Date(status.lastCheckTime).toLocaleString()}\n`
    }
    
    report += `当前活跃告警数: ${status.activeAlerts}\n\n`
    
    const recentAlerts = this.alertHistory.slice(-5)
    if (recentAlerts.length > 0) {
      report += '最近告警:\n'
      recentAlerts.forEach((alert, index) => {
        report += `${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}\n`
      })
    } else {
      report += '最近无告警\n'
    }
    
    return report
  }
}

export function createMonitor(config: Partial<MonitorConfig> = {}): DataQualityMonitor {
  return new DataQualityMonitor(config)
}

export function formatAlert(alert: QualityAlert): string {
  return `[${alert.severity.toUpperCase()}] ${alert.message}`
}

export function getAlertTypeDescription(type: AlertType): string {
  const descriptions: Record<AlertType, string> = {
    data_inconsistency: '数据不一致',
    validation_failure: '校验失败',
    missing_required_field: '缺失必填字段',
    data_format_error: '数据格式错误',
    business_rule_violation: '业务规则违反',
    data_drift: '数据偏移',
    performance_degradation: '性能下降'
  }
  
  return descriptions[type] || type
}