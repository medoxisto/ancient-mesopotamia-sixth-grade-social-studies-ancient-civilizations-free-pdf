// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let scale = 1;
let rotation = 0;
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');

// Load the PDF
async function loadPDF() {
  try {
    loadingOverlay.style.display = 'flex';
    const loadingTask = pdfjsLib.getDocument('/Grade-6-Ancient-Civilizations-Coursebook-Curriculum-Sample-July-2021.pdf');
    pdfDoc = await loadingTask.promise;
    document.getElementById('pageCount').textContent = pdfDoc.numPages;
    await renderPage(pageNum);
    await generateThumbnails();
    await generateOutline();
    loadingOverlay.style.display = 'none';
  } catch (error) {
    console.error('Error loading PDF:', error);
    loadingOverlay.style.display = 'none';
  }
}

// Render the specified page
async function renderPage(num) {
  try {
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale, rotation });
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    document.getElementById('pageNum').textContent = num;
    updateThumbnailHighlight();
  } catch (error) {
    console.error('Error rendering page:', error);
  }
}

// Generate thumbnails
async function generateThumbnails() {
  const thumbnailsContainer = document.getElementById('thumbnails');
  thumbnailsContainer.innerHTML = '';
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 0.2 });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail';
    thumbnail.appendChild(canvas);
    thumbnail.onclick = () => {
      pageNum = i;
      renderPage(pageNum);
    };
    
    thumbnailsContainer.appendChild(thumbnail);
  }
}

// Generate outline with better error handling and recursive structure
async function generateOutline() {
  try {
    const outline = await pdfDoc.getOutline();
    const container = document.getElementById('outline');
    container.innerHTML = '';
    
    if (!outline || outline.length === 0) {
      const noOutline = document.createElement('p');
      noOutline.textContent = 'No table of contents available';
      noOutline.style.padding = '10px';
      noOutline.style.color = document.body.classList.contains('dark-mode') ? '#aaa' : '#666';
      container.appendChild(noOutline);
      return;
    }

    const createOutlineList = async (items) => {
      const ul = document.createElement('ul');
      
      for (const item of items) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = item.title;
        a.href = '#';
        
        a.onclick = async (e) => {
          e.preventDefault();
          try {
            if (item.dest) {
              let pageRef;
              if (Array.isArray(item.dest)) {
                pageRef = item.dest[0];
              } else {
                const destination = await pdfDoc.getDestination(item.dest);
                pageRef = destination[0];
              }
              
              // Get the page number and any additional positioning information
              const pageIndex = await pdfDoc.getPageIndex(pageRef);
              pageNum = pageIndex + 1;
              
              // Handle positioning if available
              let scrollTo = null;
              if (Array.isArray(item.dest) && item.dest.length > 1) {
                scrollTo = {
                  pageIndex,
                  destArray: item.dest.slice(1)
                };
              }
              
              await renderPage(pageNum);
              
              // Scroll the thumbnail into view
              const thumbnails = document.querySelectorAll('.thumbnail');
              thumbnails[pageNum - 1]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
              });
              
              // Handle specific positioning on the page if available
              if (scrollTo) {
                // This would need to be implemented based on the PDF spec
                // Currently just scrolls to the page
                canvas.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }
            }
          } catch (error) {
            console.error('Error navigating to outline destination:', error);
          }
        };
        
        li.appendChild(a);
        
        if (item.items && item.items.length > 0) {
          const childList = await createOutlineList(item.items);
          li.appendChild(childList);
        }
        
        ul.appendChild(li);
      }
      
      return ul;
    };
    
    const outlineList = await createOutlineList(outline);
    container.appendChild(outlineList);
    
  } catch (error) {
    console.error('Error generating outline:', error);
    const errorMsg = document.createElement('p');
    errorMsg.textContent = 'Error loading table of contents';
    errorMsg.style.padding = '10px';
    errorMsg.style.color = '#f44336';
    container.appendChild(errorMsg);
  }
}

function updateThumbnailHighlight() {
  const thumbnails = document.querySelectorAll('.thumbnail');
  thumbnails.forEach((thumb, index) => {
    thumb.classList.toggle('active', index + 1 === pageNum);
  });
}

// Navigation handlers
document.getElementById('prev').addEventListener('click', () => {
  if (pageNum <= 1) return;
  pageNum--;
  renderPage(pageNum);
});

document.getElementById('next').addEventListener('click', () => {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  renderPage(pageNum);
});

// Zoom handlers
document.getElementById('zoomIn').addEventListener('click', () => {
  scale *= 1.25;
  renderPage(pageNum);
});

document.getElementById('zoomOut').addEventListener('click', () => {
  scale *= 0.8;
  renderPage(pageNum);
});

document.getElementById('zoom').addEventListener('change', (e) => {
  scale = parseFloat(e.target.value);
  renderPage(pageNum);
});

// Rotation handlers
document.getElementById('rotateCW').addEventListener('click', () => {
  rotation = (rotation + 90) % 360;
  renderPage(pageNum);
});

document.getElementById('rotateCCW').addEventListener('click', () => {
  rotation = (rotation - 90) % 360;
  renderPage(pageNum);
});

// Fullscreen handler
document.getElementById('fullscreen').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

// Download handler
document.getElementById('download').addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = '/Grade-6-Ancient-Civilizations-Coursebook-Curriculum-Sample-July-2021.pdf';
  link.download = 'Ancient-Civilizations-6th-Grade.pdf';
  link.click();
});

// Print handler
document.getElementById('print').addEventListener('click', () => {
  window.print();
});

// Dark mode toggle
document.getElementById('darkMode').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
  
  // Update dark mode button icon
  const darkModeIcon = document.getElementById('darkMode').querySelector('i');
  darkModeIcon.classList.toggle('fa-moon');
  darkModeIcon.classList.toggle('fa-sun');
  
  // Re-render current page to update canvas background
  renderPage(pageNum);
});

// Initialize dark mode from localStorage
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  document.querySelector('#darkMode i').classList.remove('fa-moon');
  document.querySelector('#darkMode i').classList.add('fa-sun');
}

// Initialize the viewer
loadPDF();

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') {
    document.getElementById('next').click();
  } else if (e.key === 'ArrowLeft') {
    document.getElementById('prev').click();
  }
});