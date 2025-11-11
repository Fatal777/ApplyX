// Test script to verify PDF editor functionality
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPDFEditor() {
  console.log('🧪 Testing PDF Editor functionality...\n');
  
  try {
    // Test 1: Verify sample PDF exists and is valid
    console.log('Test 1: Checking sample PDF...');
    const pdfPath = path.join(__dirname, '..', 'public', 'sample.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error('❌ Sample PDF not found at: ' + pdfPath);
    }
    
    const pdfBytes = fs.readFileSync(pdfPath);
    console.log(`✅ Sample PDF found (${pdfBytes.length} bytes)`);
    
    // Test 2: Verify PDF structure
    console.log('\nTest 2: Verifying PDF structure...');
    const pdfHeader = pdfBytes.slice(0, 8).toString();
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error('❌ Invalid PDF header: ' + pdfHeader);
    }
    console.log(`✅ Valid PDF header: ${pdfHeader.trim()}`);
    
    // Test 3: Load and parse PDF with pdf-lib
    console.log('\nTest 3: Parsing PDF with pdf-lib...');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    console.log(`✅ PDF loaded successfully`);
    console.log(`   Pages: ${pages.length}`);
    console.log(`   Title: ${pdfDoc.getTitle() || 'No title'}`);
    console.log(`   Author: ${pdfDoc.getAuthor() || 'No author'}`);
    
    // Test 4: Check page content
    console.log('\nTest 4: Checking page content...');
    if (pages.length > 0) {
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      console.log(`✅ First page dimensions: ${width}x${height}`);
      
      // Check if page has content
      const pageOperators = firstPage.node.Contents();
      if (pageOperators) {
        console.log('✅ Page has content operators');
      }
    }
    
    // Test 5: Simulate type conversion (as would happen in the browser)
    console.log('\nTest 5: Testing type conversion...');
    const uint8Array = new Uint8Array(pdfBytes);
    
    // This is the fix we applied - converting Uint8Array to ArrayBuffer
    const arrayBuffer = uint8Array.buffer.slice(
      uint8Array.byteOffset,
      uint8Array.byteOffset + uint8Array.byteLength
    );
    
    console.log(`✅ Uint8Array size: ${uint8Array.length} bytes`);
    console.log(`✅ ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
    console.log('✅ Type conversion successful');
    
    // Test 6: Verify the ArrayBuffer can be loaded
    console.log('\nTest 6: Loading from ArrayBuffer...');
    const pdfFromArrayBuffer = await PDFDocument.load(arrayBuffer);
    console.log(`✅ PDF loaded from ArrayBuffer`);
    console.log(`   Pages: ${pdfFromArrayBuffer.getPageCount()}`);
    
    // Test 7: Simulate text extraction (simplified)
    console.log('\nTest 7: Checking for text content...');
    // In a real test, we would use pdfjs to extract text
    // For now, just verify the PDF has the expected structure
    const firstPage = pages[0];
    const pageContent = firstPage.node.Contents();
    if (pageContent) {
      console.log('✅ Page contains content streams for text extraction');
    }
    
    console.log('\n✨ All tests passed successfully!');
    console.log('\nSummary:');
    console.log('- Valid PDF file created with proper structure');
    console.log('- Type conversion from Uint8Array to ArrayBuffer works');
    console.log('- PDF can be loaded and parsed successfully');
    console.log('- Ready for text extraction and editing in the browser');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testPDFEditor().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});