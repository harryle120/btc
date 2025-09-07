// Common types for the application

export interface ProcessedData {
    name: string;
    value: number;
    processed: boolean;
    timestamp: string;
}

export interface CalculationResult {
    operation: string;
    input: number[];
    result: number;
    timestamp: string;
}

export interface FunctionResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    executionTime: number;
}

export interface LoggerConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableTimestamp: boolean;
    enableColors: boolean;
}
