import { logger } from "../utils/logger";

// Simple example function
export function exampleFunction(message: string): string {
  logger.debug(`Processing message: ${message}`);
  return `Processed: ${message.toUpperCase()}`;
}

// Math utility function
export function calculateSum(numbers: number[]): number {
  logger.debug(`Calculating sum of: ${numbers.join(", ")}`);
  return numbers.reduce((sum, num) => sum + num, 0);
}

// Async function example
export async function processData(data: {
  name: string;
  value: number;
}): Promise<{
  name: string;
  value: number;
  processed: boolean;
  timestamp: string;
}> {
  logger.debug(`Processing data: ${JSON.stringify(data)}`);

  // Simulate async processing
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    ...data,
    processed: true,
    timestamp: new Date().toISOString(),
  };
}

// Function to demonstrate error handling
export function divideNumbers(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero is not allowed");
  }
  return a / b;
}

// Function to demonstrate array operations
export function filterEvenNumbers(numbers: number[]): number[] {
  return numbers.filter((num) => num % 2 === 0);
}

// Function to demonstrate string operations
export function formatCurrency(
  amount: number,
  currency: string = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}
