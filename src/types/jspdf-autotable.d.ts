declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf";

  interface AutoTableOptions {
    head?: (string | number)[][];
    body?: (string | number)[][];
    foot?: (string | number)[][];
    startY?: number;
    margin?: { top?: number; right?: number; bottom?: number; left?: number };
    headStyles?: Record<string, any>;
    bodyStyles?: Record<string, any>;
    alternateRowStyles?: Record<string, any>;
    columnStyles?: Record<number, Record<string, any>>;
    didDrawPage?: (data: any) => void;
    [key: string]: any;
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): { finalY: number };
}

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: import("jspdf-autotable").AutoTableOptions) => { finalY: number };
    lastAutoTable?: { finalY: number };
  }
}
