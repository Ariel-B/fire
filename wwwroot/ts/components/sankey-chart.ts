/**
 * Sankey Chart Component
 * Renders interactive Sankey diagrams for money flow visualization
 */

import type {
  FireCalculationResult,
  SankeyDiagramData,
  SankeyFlowType,
  Currency
} from '../types/index.js';
import {
  transformToSankeyData,
  getSankeyStatistics,
  getDefaultColorScheme
} from '../services/sankey-data-service.js';
import { formatCurrency } from '../utils/formatter.js';

// Declare D3 from CDN
declare const d3: any;

/**
 * Sankey Chart Manager
 * Handles rendering and interaction for Sankey money flow diagrams
 */
export class SankeyChartManager {
  private svg: any;
  private svgId: string;
  private currentData: SankeyDiagramData | null = null;
  private originalYearlyData: any[] | null = null; // Store original data for re-transformation
  private currentStartYear: number | null = null;
  private windowSize: number = 5;
  private colorScheme = getDefaultColorScheme();
  private currency: Currency = '₪';
  private usdIlsRate: number = 3.6;

  constructor(svgId: string = 'sankey-chart') {
    this.svgId = svgId;
    this.svg = d3.select(`#${svgId}`);
    
    // Check if D3 and d3Sankey are available
    if (typeof d3 === 'undefined') {
      console.error('D3 library not loaded!');
    } else {
      if (typeof d3.sankey === 'undefined') {
        console.error('d3-sankey library not loaded (d3.sankey is undefined)!');
      }
    }
    
    this.setupEventListeners();
  }

  /**
   * Get container element (lazily, in case it's hidden during construction)
   */
  private getContainer(): HTMLElement | null {
    return document.getElementById('sankey-container');
  }

  /**
   * Setup event listeners for controls
   */
  private setupEventListeners(): void {
    // Navigation buttons
    document.getElementById('sankey-prev-year')?.addEventListener('click', () => this.prevWindow());
    document.getElementById('sankey-next-year')?.addEventListener('click', () => this.nextWindow());

    // Input fields
    document.getElementById('sankey-start-year')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value);
      if (!isNaN(val) && this.originalYearlyData) {
        const minYear = this.originalYearlyData[0].year;
        const maxYear = this.originalYearlyData[this.originalYearlyData.length - 1].year;
        
        // Clamp value
        this.currentStartYear = Math.max(minYear, Math.min(maxYear, val));
        target.value = this.currentStartYear.toString();
        this.render();
      }
    });

    document.getElementById('sankey-window-size')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value);
      if (!isNaN(val) && val > 0) {
        this.windowSize = val;
        this.render();
      }
    });

    // Export buttons
    document.getElementById('export-sankey-png')?.addEventListener('click', () => this.exportAsPNG());
    document.getElementById('export-sankey-csv')?.addEventListener('click', () => this.exportAsCSV());
  }

  /**
   * Move window to previous year
   */
  private prevWindow(): void {
    if (this.currentStartYear !== null && this.originalYearlyData && this.originalYearlyData.length > 0) {
      const minYear = this.originalYearlyData[0].year;
      if (this.currentStartYear > minYear) {
        this.currentStartYear--;
        this.render();
      }
    }
  }

  /**
   * Move window to next year
   */
  private nextWindow(): void {
    if (this.currentStartYear !== null && this.originalYearlyData && this.originalYearlyData.length > 0) {
      const maxYear = this.originalYearlyData[this.originalYearlyData.length - 1].year;
      if (this.currentStartYear < maxYear) {
        this.currentStartYear++;
        this.render();
      }
    }
  }

  /**
   * Update the chart with new calculation results
   */
  public update(result: FireCalculationResult, currency: Currency, usdIlsRate: number): void {
    this.currency = currency;
    this.usdIlsRate = usdIlsRate;
    
    if (!result.yearlyData || result.yearlyData.length === 0) {
      this.showMessage('אין נתונים להצגה');
      return;
    }

    // Store original data for re-transformation
    this.originalYearlyData = result.yearlyData;
    
    // Initialize start year if not set or if out of bounds
    const firstYear = result.yearlyData[0].year;
    if (this.currentStartYear === null || this.currentStartYear < firstYear) {
      this.currentStartYear = firstYear;
    }
    
    this.render();
    this.updateStatistics();
  }

  /**
   * Force re-render of the chart (useful when tab becomes visible)
   */
  public refresh(): void {
    if (this.originalYearlyData) {
      this.render();
    } else {
      this.showMessage('הזן נתונים בתיק הצבירה כדי לראות את תרשים תזרים הכספים');
    }
  }

  /**
   * Update navigation controls state
   */
  private updateControls(): void {
    if (!this.originalYearlyData || this.currentStartYear === null) return;

    const minYear = this.originalYearlyData[0].year;
    const maxYear = this.originalYearlyData[this.originalYearlyData.length - 1].year;
    const endYear = this.currentStartYear + this.windowSize;

    // Update display text
    const displayEl = document.getElementById('sankey-year-display');
    if (displayEl) {
      displayEl.textContent = `${this.currentStartYear} - ${endYear}`;
    }

    // Update inputs
    const startYearInput = document.getElementById('sankey-start-year') as HTMLInputElement;
    if (startYearInput) {
      startYearInput.value = this.currentStartYear.toString();
      startYearInput.min = minYear.toString();
      startYearInput.max = maxYear.toString();
    }

    const windowSizeInput = document.getElementById('sankey-window-size') as HTMLInputElement;
    if (windowSizeInput) {
      windowSizeInput.value = this.windowSize.toString();
    }

    // Update buttons state
    const prevBtn = document.getElementById('sankey-prev-year') as HTMLButtonElement;
    const nextBtn = document.getElementById('sankey-next-year') as HTMLButtonElement;

    if (prevBtn) {
      prevBtn.disabled = this.currentStartYear <= minYear;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentStartYear >= maxYear;
    }
  }

  /**
   * Render the Sankey diagram
   */
  private render(): void {
    if (!this.originalYearlyData || this.currentStartYear === null) {
      this.showMessage('הזן נתונים בתיק הצבירה כדי לראות את תרשים תזרים הכספים');
      return;
    }

    // Calculate year range
    const endYear = this.currentStartYear + this.windowSize;
    const yearRange = { start: this.currentStartYear, end: endYear };
    
    // Transform data for the current window
    this.currentData = transformToSankeyData(this.originalYearlyData, 'full', yearRange);
    
    // Update controls
    this.updateControls();

    // Get container (might be null if tab is hidden)
    const container = this.getContainer();
    if (!container) {
      console.warn('Sankey container not found, skipping render');
      return;
    }

    // Check if container is visible (has dimensions)
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      return;
    }

    // Hide message, show chart
    document.getElementById('sankey-message')?.classList.add('hidden');
    this.svg.style('display', 'block');
    
    // Verify SVG element exists
    const svgElement = document.getElementById(this.svgId);
    if (!svgElement) {
      console.error('SVG element not found:', this.svgId);
      this.showMessage('שגיאה: אלמנט SVG לא נמצא');
      return;
    }

    // Use currentData directly (no flow filtering)
    const filteredData = this.currentData;

    if (filteredData.nodes.length === 0 || filteredData.links.length === 0) {
      this.showMessage('אין נתונים להצגה בטווח השנים הנבחר');
      return;
    }

    // Clear previous chart
    this.svg.selectAll('*').remove();

    // Set dimensions
    const containerWidth = container.clientWidth;
    const width = Math.max(containerWidth - 40, 800);
    const height = 600;
    const margin = { top: 20, right: 40, bottom: 20, left: 40 };

    this.svg
      .attr('width', width)
      .attr('height', height);

    // Check if d3.sankey is available
    if (typeof d3 === 'undefined' || typeof d3.sankey !== 'function') {
      console.error('d3.sankey is not available!');
      this.showMessage('שגיאה: ספריית Sankey לא נטענה');
      return;
    }

    // Calculate year range for positioning
    const years = [...new Set(filteredData.nodes.map(n => n.year))].sort((a, b) => a - b);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const yearSpan = maxYear - minYear + 1;
    const xStep = (width - margin.left - margin.right) / Math.max(1, yearSpan);

    // Create sankey generator with fixed node positions
    const sankey = d3.sankey()
      .nodeId((d: any) => d.id)
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .nodeSort(null); // Disable automatic sorting to preserve our custom positions

    // Prepare data with fixed x positions based on year
    const graph = {
      nodes: filteredData.nodes.map(n => {
        const yearIndex = n.year - minYear;
        const x = margin.left + yearIndex * xStep;
        return { 
          ...n,
          fixedX: x // Store the fixed x position
        };
      }),
      links: filteredData.links.map(l => ({
        source: l.source,
        target: l.target,
        value: l.value,
        flowType: l.flowType
      }))
    };

    // Generate sankey layout
    let { nodes, links } = sankey(graph);
    
    // Override x positions to match years
    nodes.forEach((node: any) => {
      const yearIndex = node.year - minYear;
      const x = margin.left + yearIndex * xStep;
      node.x0 = x;
      node.x1 = x + 15; // nodeWidth
    });
    
    // Recalculate link positions with fixed x coordinates
    sankey.update({ nodes, links });
    
    // Draw links
    this.svg.append('g')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', (d: any) => this.getFlowColor(d.flowType))
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .attr('fill', 'none')
      .attr('opacity', 0.5)
      .on('mouseover', (event: any, d: any) => this.showLinkTooltip(event, d))
      .on('mouseout', () => this.hideTooltip());

    // Draw nodes
    const nodeGroup = this.svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g');

    nodeGroup.append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => d.type === 'portfolio' ? this.colorScheme.portfolio : '#94a3b8')
      .attr('opacity', 0.8)
      .on('mouseover', (event: any, d: any) => this.showNodeTooltip(event, d))
      .on('mouseout', () => this.hideTooltip());

    // Add node labels
    nodeGroup.append('text')
      .attr('x', (d: any) => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', (d: any) => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => d.x0 < width / 2 ? 'start' : 'end')
      .attr('font-size', '10px')
      .text((d: any) => d.id.split(' ')[0]); // Show only the type, not the year
  }

  /**
   * Get color for a flow type
   */
  private getFlowColor(flowType: SankeyFlowType): string {
    return this.colorScheme[flowType] || '#94a3b8';
  }

  /**
   * Show tooltip for link
   */
  private showLinkTooltip(event: any, link: any): void {
    const amount = formatCurrency(link.value, this.currency);
    const flowTypeName = this.getFlowTypeName(link.flowType);
    
    d3.select('body').append('div')
      .attr('class', 'sankey-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .html(`<strong>${flowTypeName}</strong><br>${amount}`)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  }

  /**
   * Show tooltip for node
   */
  private showNodeTooltip(event: any, node: any): void {
    const amount = formatCurrency(node.value, this.currency);
    
    d3.select('body').append('div')
      .attr('class', 'sankey-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .html(`<strong>${node.id}</strong><br>${amount}`)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    d3.selectAll('.sankey-tooltip').remove();
  }

  /**
   * Get Hebrew name for flow type
   */
  private getFlowTypeName(flowType: SankeyFlowType): string {
    const names: Record<SankeyFlowType, string> = {
      contributions: 'הפקדות',
      growth: 'צמיחת תיק',
      rsu: 'RSU',
      tax: 'מס רווחי הון',
      expenses: 'הוצאות מתוכננות',
      withdrawals: 'משיכות פרישה',
      rebalancingTax: 'מס איזון פרישה'
    };
    return names[flowType] || flowType;
  }

  /**
   * Show a message instead of the chart
   */
  private showMessage(message: string): void {
    const messageEl = document.getElementById('sankey-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.classList.remove('hidden');
    }
    this.svg.style('display', 'none');
  }

  /**
   * Update statistics display
   */
  private updateStatistics(): void {
    if (!this.currentData) return;

    const stats = getSankeyStatistics(this.currentData);

    const inflowsEl = document.getElementById('sankey-total-inflows');
    const outflowsEl = document.getElementById('sankey-total-outflows');
    const netFlowEl = document.getElementById('sankey-net-flow');
    const yearRangeEl = document.getElementById('sankey-year-range');

    if (inflowsEl) inflowsEl.textContent = formatCurrency(stats.totalInflows, this.currency);
    if (outflowsEl) outflowsEl.textContent = formatCurrency(stats.totalOutflows, this.currency);
    if (netFlowEl) netFlowEl.textContent = formatCurrency(stats.netFlow, this.currency);
    if (yearRangeEl) yearRangeEl.textContent = `${stats.yearRange.start}-${stats.yearRange.end}`;
  }

  /**
   * Export chart as PNG
   */
  private exportAsPNG(): void {
    if (!this.currentData) {
      return;
    }

    const svgElement = this.svg.node();
    if (!(svgElement instanceof SVGSVGElement)) {
      alert('שגיאה בייצוא התרשים ל-PNG');
      return;
    }

    const width = Math.max(1, Math.round(svgElement.getBoundingClientRect().width || 1200));
    const height = Math.max(1, Math.round(svgElement.getBoundingClientRect().height || 600));
    const serializer = new XMLSerializer();
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgClone.setAttribute('width', width.toString());
    svgClone.setAttribute('height', height.toString());

    const svgMarkup = serializer.serializeToString(svgClone);
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        alert('שגיאה בייצוא התרשים ל-PNG');
        return;
      }

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `money-flow-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    image.onerror = () => {
      alert('שגיאה בייצוא התרשים ל-PNG');
    };

    image.src = svgUrl;
  }

  /**
   * Export data as CSV
   */
  private exportAsCSV(): void {
    if (!this.currentData) return;

    const csvLines = ['Source,Target,Value,Flow Type,Year'];
    this.currentData.links.forEach(link => {
      csvLines.push(`"${link.source}","${link.target}",${link.value},"${link.flowType}",${link.year}`);
    });

    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `money-flow-${Date.now()}.csv`;
    link.click();
  }
}
