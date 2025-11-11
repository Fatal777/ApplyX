// Script to generate a valid sample PDF for testing
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createSampleResumePDF() {
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();

  // Add a page
  const page = pdfDoc.addPage([612, 792]); // US Letter size
  const { width, height } = page.getSize();

  // Embed fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Header - Name
  page.drawText('John Doe', {
    x: 50,
    y: height - 80,
    size: 32,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Title
  page.drawText('Senior Software Engineer', {
    x: 50,
    y: height - 120,
    size: 18,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Contact Info
  page.drawText('Email: john.doe@email.com | Phone: (555) 123-4567 | LinkedIn: linkedin.com/in/johndoe', {
    x: 50,
    y: height - 150,
    size: 11,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText('Location: San Francisco, CA | GitHub: github.com/johndoe', {
    x: 50,
    y: height - 165,
    size: 11,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Professional Summary
  page.drawText('PROFESSIONAL SUMMARY', {
    x: 50,
    y: height - 210,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const summaryText = 
    'Experienced software engineer with 8+ years developing scalable web applications and distributed systems.\n' +
    'Expertise in React, Node.js, Python, and cloud technologies. Proven track record of leading technical teams\n' +
    'and delivering high-impact projects that improve user experience and business metrics.';

  const summaryLines = summaryText.split('\n');
  let yPosition = height - 235;
  for (const line of summaryLines) {
    page.drawText(line, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 15;
  }

  // Work Experience
  page.drawText('WORK EXPERIENCE', {
    x: 50,
    y: height - 310,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Job 1
  page.drawText('Senior Software Engineer', {
    x: 50,
    y: height - 335,
    size: 12,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('TechCorp Inc. | San Francisco, CA', {
    x: 50,
    y: height - 350,
    size: 11,
    font: helveticaOblique,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText('January 2021 - Present', {
    x: width - 150,
    y: height - 335,
    size: 11,
    font: helveticaOblique,
    color: rgb(0.3, 0.3, 0.3),
  });

  const job1Bullets = [
    '• Led development of microservices architecture serving 10M+ daily users with 99.9% uptime',
    '• Reduced page load times by 40% through optimization of React components and API caching',
    '• Mentored team of 5 engineers and established code review best practices',
    '• Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
  ];

  yPosition = height - 370;
  for (const bullet of job1Bullets) {
    page.drawText(bullet, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 15;
  }

  // Job 2
  page.drawText('Software Engineer II', {
    x: 50,
    y: height - 455,
    size: 12,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('StartupXYZ | Remote', {
    x: 50,
    y: height - 470,
    size: 11,
    font: helveticaOblique,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText('June 2018 - December 2020', {
    x: width - 180,
    y: height - 455,
    size: 11,
    font: helveticaOblique,
    color: rgb(0.3, 0.3, 0.3),
  });

  const job2Bullets = [
    '• Built RESTful APIs and GraphQL endpoints handling 1M+ requests daily',
    '• Developed real-time collaboration features using WebSockets and Redis',
    '• Improved test coverage from 45% to 85% using Jest and React Testing Library',
  ];

  yPosition = height - 490;
  for (const bullet of job2Bullets) {
    page.drawText(bullet, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 15;
  }

  // Technical Skills
  page.drawText('TECHNICAL SKILLS', {
    x: 50,
    y: height - 565,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const skills = [
    'Languages: JavaScript/TypeScript, Python, Java, Go, SQL',
    'Frontend: React, Next.js, Vue.js, HTML5, CSS3, Tailwind CSS, Material-UI',
    'Backend: Node.js, Express, Django, FastAPI, GraphQL, REST APIs',
    'Databases: PostgreSQL, MongoDB, Redis, Elasticsearch',
    'Cloud/DevOps: AWS, Docker, Kubernetes, CI/CD, Terraform, GitHub Actions',
  ];

  yPosition = height - 590;
  for (const skill of skills) {
    page.drawText(skill, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 15;
  }

  // Education
  page.drawText('EDUCATION', {
    x: 50,
    y: height - 690,
    size: 14,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('Bachelor of Science in Computer Science', {
    x: 50,
    y: height - 715,
    size: 12,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('University of California, Berkeley | Graduated: May 2018', {
    x: 50,
    y: height - 730,
    size: 11,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Write the PDF to the public directory
  const outputPath = path.join(__dirname, '..', 'public', 'sample.pdf');
  fs.writeFileSync(outputPath, pdfBytes);

  console.log(`✅ Sample PDF created successfully at: ${outputPath}`);
  console.log(`📄 PDF size: ${pdfBytes.length} bytes`);
  console.log(`📃 Pages: 1`);
}

// Run the script
createSampleResumePDF().catch(err => {
  console.error('❌ Error creating sample PDF:', err);
  process.exit(1);
});