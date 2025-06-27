# DESHKAR ADVERTISING - Invoice Management System

A professional invoice management system built with Next.js for DESHKAR ADVERTISING, featuring Indian GST compliance, multi-page PDF generation, and Excel export capabilities.

## 🚀 Features

### 📋 Invoice Management
- **Professional Invoice Creation** with elegant UI design
- **Indian GST Compliance** (CGST/SGST/IGST calculations)
- **Multi-page PDF Support** with 13-row pagination
- **Excel Export** functionality
- **Real-time Preview** for both PDF and Excel formats

### 🏢 Business Features
- **Advertising Industry Specific** fields (Town, Location, Media, Size, Area, Rate P.M.)
- **Automatic Period Calculation** from start date + duration
- **Amount Calculation** with manual override option
- **Copy Items** functionality for quick duplication
- **State Auto-detection** from GSTIN

### 📄 Document Features
- **Header/Footer Images** support (JPG format)
- **Multi-page Invoices** with C/F (Carry Forward) and B/F (Brought Forward)
- **Professional Layout** with proper boxing and styling
- **Amount in Words** conversion
- **Terms & Conditions** customization

## 🛠️ Technology Stack

- **Framework**: Next.js 15.3.4 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Generation**: jsPDF with autoTable
- **Excel Export**: XLSX library
- **Icons**: Lucide React
- **Build Tool**: Turbopack

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/amitkkna/deshkarinvoice.git
cd deshkarinvoice
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

4. **Open in browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
deskar-invoice/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   │   ├── InvoiceForm.tsx  # Main invoice form
│   │   └── InvoicePreview.tsx # PDF/Excel preview
│   ├── lib/                 # Utility libraries
│   │   ├── pdf-export.ts    # PDF generation
│   │   ├── excel-export.ts  # Excel generation
│   │   └── utils.ts         # Helper functions
│   └── types/               # TypeScript definitions
├── public/                  # Static assets
│   ├── header-image.jpg     # Invoice header image
│   └── footer-image.jpg     # Invoice footer image
└── README.md
```

## 🎯 Key Features

### GST Compliance
- **Automatic State Detection** from GSTIN
- **Interstate/Intrastate** transaction handling
- **CGST/SGST** for intrastate transactions
- **IGST** for interstate transactions

### Professional Invoice Layout
- **13-row pagination** on first page
- **Continuation pages** with proper headers
- **Elegant styling** with gradients and shadows
- **Responsive design** for all screen sizes

### Export Options
- **PDF Export** with professional formatting
- **Excel Export** with structured data
- **Preview Mode** before downloading
- **Multi-page support** for large invoices

## 🏢 About DESHKAR ADVERTISING

This invoice system is specifically designed for DESHKAR ADVERTISING, incorporating:
- Industry-specific fields for advertising services
- Indian tax compliance requirements
- Professional branding and layout
- Efficient workflow for invoice generation

## 📝 License

This project is proprietary software developed for DESHKAR ADVERTISING.

## 🤝 Contributing

This is a private project for DESHKAR ADVERTISING. For any modifications or support, please contact the development team.

---

**© 2024 DESHKAR ADVERTISING - Professional Invoice Management System**
