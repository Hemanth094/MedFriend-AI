// static/script.js
const chatBox = document.getElementById('chat-box');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

function appendMessage(text, sender) {
  if (!chatBox) return;
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  if (sender === 'bot') {
    msg.innerHTML = text;
  } else {
    msg.textContent = text;
  }
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sanitizeHTML(dirty) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, 'text/html');
  const whitelist = new Set(['BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'P']);
  function clean(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!whitelist.has(child.tagName)) {
          const frag = document.createDocumentFragment();
          while (child.firstChild) frag.appendChild(child.firstChild);
          node.replaceChild(frag, child);
        } else {
          for (const attr of Array.from(child.attributes)) child.removeAttribute(attr.name);
          clean(child);
        }
      } else if (child.nodeType !== Node.TEXT_NODE) {
        node.removeChild(child);
      }
    }
  }
  clean(doc.body);
  return doc.body.innerHTML;
}

async function sendMessage() {
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  appendMessage(text, 'user');
  input.value = '';
  console.log('→ Sending to /chat:', text);
  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('Network response not ok', res.status, t);
      appendMessage('⚠️ Server returned status ' + res.status, 'bot');
      return;
    }
    let data;
    try {
      data = await res.json();
      console.log('← JSON received:', data);
    } catch (err) {
      const txt = await res.text();
      console.warn('← Non-JSON response, fallback to text:', txt);
      data = { reply: txt };
    }
    let replyRaw = '';
    if (typeof data === 'string') replyRaw = data;
    else if (data.reply) replyRaw = data.reply;
    else if (data.bot) replyRaw = data.bot;
    else if (data.message) replyRaw = data.message;
    else replyRaw = JSON.stringify(data);
    replyRaw = String(replyRaw).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
    const safe = sanitizeHTML(replyRaw);
    appendMessage(safe, 'bot');
  } catch (err) {
    console.error('Fetch error:', err);
    appendMessage('⚠️ Network or server error. Open DevTools Console for details.', 'bot');
  }
}

if (sendBtn) {
  sendBtn.addEventListener('click', sendMessage);
}
if (input) {
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const logoLink = document.getElementById('logoLink');
  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      const currentPath = window.location.pathname;
      const homePath = logoLink.getAttribute('href');
      if (currentPath === homePath || currentPath === '/') {
        window.location.reload();
      } else {
        window.location.href = homePath;
      }
    });
  }

  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const spans = hamburger.querySelectorAll('span');
      if (navMenu.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      }
    });
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      });
    });
  }

  const chatbotBtn = document.getElementById('chatbotBtn');
  const chatbotPopup = document.getElementById('chatbotPopup');
  const closeChatbot = document.getElementById('closeChatbot');
  const chatbotInput = document.getElementById('chatbotInput');
  const chatbotSend = document.getElementById('chatbotSend');
  const chatbotMessages = document.getElementById('chatbotMessages');
  let chatbotInitialized = false;

  if (chatbotBtn && chatbotPopup) {
    chatbotBtn.addEventListener('click', () => {
      chatbotPopup.classList.add('active');
      if (chatbotInput) chatbotInput.focus();
      if (!chatbotInitialized && chatbotMessages && chatbotMessages.children.length === 0) {
        chatbotInitialized = true;
        initializeChatbot();
      }
    });
  }

  async function initializeChatbot() {
    if (!chatbotMessages) return;
    try {
      await fetch('/chat/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'init' })
      });
      if (!res.ok) {
        addChatbotMessage('⚠️ Unable to connect to server', 'bot');
        return;
      }
      let data;
      try {
        data = await res.json();
      } catch (err) {
        const txt = await res.text();
        data = { reply: txt };
      }
      let replyRaw = '';
      if (typeof data === 'string') replyRaw = data;
      else if (data.reply) replyRaw = data.reply;
      else if (data.bot) replyRaw = data.bot;
      else if (data.message) replyRaw = data.message;
      else replyRaw = JSON.stringify(data);
      replyRaw = String(replyRaw).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
      const safe = sanitizeHTML(replyRaw);
      addChatbotMessage(safe, 'bot');
    } catch (err) {
      console.error('Fetch error:', err);
      addChatbotMessage('⚠️ Network or server error. Please try again.', 'bot');
    }
  }

  const resetChatbot = document.getElementById('resetChatbot');
  if (resetChatbot) {
    resetChatbot.addEventListener('click', async () => {
      if (!chatbotMessages) return;
      chatbotMessages.innerHTML = '';
      chatbotInitialized = false;
      try {
        await fetch('/chat/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.warn('Reset endpoint error:', err);
      }
      initializeChatbot();
    });
  }

  if (closeChatbot && chatbotPopup) {
    closeChatbot.addEventListener('click', () => {
      chatbotPopup.classList.remove('active');
    });
  }
  if (chatbotPopup) {
    chatbotPopup.addEventListener('click', (e) => {
      if (e.target === chatbotPopup) {
        chatbotPopup.classList.remove('active');
      }
    });
  }

  async function sendChatbotMessage(skipUserMessage = false) {
    if (!chatbotMessages) return;
    let message = '';
    if (!skipUserMessage) {
      if (!chatbotInput) return;
      message = chatbotInput.value.trim();
      if (!message) return;
      addChatbotMessage(message, 'user');
      chatbotInput.value = '';
    }
    console.log('→ Sending to /chat:', message || '(initialization)');
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        console.error('Network response not ok', res.status, t);
        addChatbotMessage('⚠️ Server returned status ' + res.status, 'bot');
        return;
      }
      let data;
      try {
        data = await res.json();
      } catch (err) {
        const txt = await res.text();
        console.warn('← Non-JSON response, fallback to text:', txt);
        data = { reply: txt };
      }
      let replyRaw = '';
      if (typeof data === 'string') replyRaw = data;
      else if (data.reply) replyRaw = data.reply;
      else if (data.bot) replyRaw = data.bot;
      else if (data.message) replyRaw = data.message;
      else replyRaw = JSON.stringify(data);
      replyRaw = String(replyRaw).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
      const safe = sanitizeHTML(replyRaw);
      addChatbotMessage(safe, 'bot');
    } catch (err) {
      console.error('Fetch error:', err);
      addChatbotMessage('⚠️ Network or server error. Please try again.', 'bot');
    }
  }

  function addChatbotMessage(text, sender) {
    if (!chatbotMessages) return;
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender}-message`;
    const messageText = document.createElement('p');
    if (sender === 'bot') {
      messageText.innerHTML = text;
    } else {
      messageText.textContent = text;
    }
    messageDiv.appendChild(messageText);
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  if (chatbotSend) {
    chatbotSend.addEventListener('click', (e) => {
      e.preventDefault();
      sendChatbotMessage(false);
    });
  }
  if (chatbotInput) {
    chatbotInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendChatbotMessage(false);
      }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  const loginBtn = document.getElementById('loginBtn');
  const navbarUserSlot = document.getElementById('navbarUser');
  const clerkModal = document.getElementById('clerkModal');
  const closeClerkModal = document.getElementById('closeClerkModal');
  const clerkAuthContainer = document.getElementById('clerk-auth-container');
  let clerkMounted = false;

  async function ensureClerkReady(timeout = 15000) {
    // Wait for Clerk to be available
    if (!window.Clerk) {
      await new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
          if (window.Clerk) {
            clearInterval(interval);
            resolve();
          } else if (Date.now() - start > timeout) {
            clearInterval(interval);
            reject(new Error('Clerk SDK did not load in time'));
          }
        }, 100);
      });
    }
    
    // Wait for Clerk to be loaded
    if (!window.Clerk.loaded) {
      await window.Clerk.load();
    }
    
    // Wait a bit more for user data to be available
    let attempts = 0;
    while (attempts < 10 && window.Clerk.loaded && typeof window.Clerk.user === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    return window.Clerk;
  }

  // Initialize UI state based on authentication status
  async function initializeAuthUI() {
    try {
      const clerk = await ensureClerkReady();
      console.log('Initializing auth UI, user status:', clerk.user ? 'signed in' : 'signed out');
      if (clerk.user) {
        // User is signed in - hide login button and show user button
        console.log('User is signed in, hiding login button');
        if (loginBtn) {
          loginBtn.style.display = 'none';
          loginBtn.style.visibility = 'hidden';
        }
        if (navbarUserSlot) {
          navbarUserSlot.innerHTML = '';
          const navUserDiv = document.createElement('div');
          navUserDiv.id = 'navbar-clerk-user';
          navbarUserSlot.appendChild(navUserDiv);
          clerk.mountUserButton(navUserDiv);
        }
      } else {
        // User is not signed in - show login button and hide user slot
        console.log('User is not signed in, showing login button');
        if (loginBtn) {
          loginBtn.style.display = '';
          loginBtn.style.visibility = 'visible';
        }
        if (navbarUserSlot) {
          navbarUserSlot.innerHTML = '';
        }
      }
    } catch (error) {
      console.warn('Could not initialize auth UI:', error);
      // On error, show login button as fallback
      if (loginBtn) {
        loginBtn.style.display = '';
        loginBtn.style.visibility = 'visible';
      }
    }
  }

  // Initialize on page load - wait a bit for Clerk to be ready
  setTimeout(() => {
    initializeAuthUI();
  }, 500);

  if (loginBtn && clerkModal) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if user is already signed in - if so, don't open modal
      try {
        const clerk = await ensureClerkReady();
        // Double check - if user exists and login button is visible, something is wrong
        if (clerk.user) {
          console.log('User is already signed in, hiding login button');
          // User is already signed in, don't open modal
          if (loginBtn) {
            loginBtn.style.display = 'none';
            loginBtn.style.visibility = 'hidden';
          }
          if (navbarUserSlot) {
            navbarUserSlot.innerHTML = '';
            const navUserDiv = document.createElement('div');
            navUserDiv.id = 'navbar-clerk-user';
            navbarUserSlot.appendChild(navUserDiv);
            clerk.mountUserButton(navUserDiv);
          }
          return;
        }
      } catch (error) {
        console.warn('Could not check auth status:', error);
        // Continue to open modal if check fails
      }

      // Only open modal if user is not signed in
      clerkModal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (!clerkMounted && clerkAuthContainer) {
        try {
          const clerk = await ensureClerkReady();
          // Final check before mounting
          if (clerk.user) {
            // User signed in while we were waiting, close modal
            clerkModal.classList.remove('active');
            document.body.style.overflow = '';
            if (loginBtn) {
              loginBtn.style.display = 'none';
              loginBtn.style.visibility = 'hidden';
            }
            if (navbarUserSlot) {
              navbarUserSlot.innerHTML = '';
              const navUserDiv = document.createElement('div');
              navUserDiv.id = 'navbar-clerk-user';
              navbarUserSlot.appendChild(navUserDiv);
              clerk.mountUserButton(navUserDiv);
            }
            return;
          }
          
          clerkAuthContainer.innerHTML = '';
          const mountNode = document.createElement('div');
          mountNode.id = 'clerk-sign-in';
          clerkAuthContainer.appendChild(mountNode);
          clerk.mountSignIn(mountNode);
          clerkMounted = true;
        } catch (error) {
          console.error('Error mounting Clerk:', error);
          clerkAuthContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;"><p>Error loading authentication. Please refresh the page.</p></div>';
        }
      }
    });
  }

  if (closeClerkModal && clerkModal) {
    closeClerkModal.addEventListener('click', () => {
      clerkModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  if (clerkModal) {
    clerkModal.addEventListener('click', (e) => {
      if (e.target === clerkModal) {
        clerkModal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  ensureClerkReady().then((clerk) => {
    if (clerk && clerk.addListener) {
      clerk.addListener((event) => {
        if (event.type === 'user') {
          if (event.user) {
            // User signed in - update UI
            console.log('User signed in event detected');
            if (loginBtn) {
              loginBtn.style.display = 'none';
              loginBtn.style.visibility = 'hidden';
            }
            if (navbarUserSlot) {
              navbarUserSlot.innerHTML = '';
              const navUserDiv = document.createElement('div');
              navUserDiv.id = 'navbar-clerk-user';
              navbarUserSlot.appendChild(navUserDiv);
              clerk.mountUserButton(navUserDiv);
            }
            // Close the modal if it's open
            if (clerkModal) {
              clerkModal.classList.remove('active');
              document.body.style.overflow = '';
            }
            // Update modal content if it exists
            if (clerkAuthContainer) {
              clerkAuthContainer.innerHTML = '';
              const mountNode = document.createElement('div');
              mountNode.id = 'clerk-user-button';
              clerkAuthContainer.appendChild(mountNode);
              clerk.mountUserButton(mountNode);
            }
            clerkMounted = false; // Reset so it can be remounted if needed
          } else {
            // User signed out - update UI
            console.log('User signed out event detected');
            clerkMounted = false; // Reset so sign-in can be mounted again
            if (loginBtn) {
              loginBtn.style.display = '';
              loginBtn.style.visibility = 'visible';
            }
            if (navbarUserSlot) {
              navbarUserSlot.innerHTML = '';
            }
            // Update modal content if it exists
            if (clerkAuthContainer) {
              clerkAuthContainer.innerHTML = '';
              const mountNode = document.createElement('div');
              mountNode.id = 'clerk-sign-in';
              clerkAuthContainer.appendChild(mountNode);
              clerk.mountSignIn(mountNode);
            }
          }
        }
      });
    }
  }).catch((error) => {
    console.warn('Clerk event binding skipped:', error.message);
  });

  const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  document.querySelectorAll('.feature-card, .service-card, .value-card, .team-card').forEach((card) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
});

