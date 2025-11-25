// Clerk Authentication Integration for MedFriend
// This file handles Clerk authentication

let clerk = null;

// Get Clerk publishable key - read it at initialization time, not when file loads
function getClerkPubKey() {
    return window.CLERK_PUBLISHABLE_KEY || 'pk_test_your_publishable_key_here';
}

// Wait for Clerk SDK to load
function waitForClerk(maxAttempts = 50, interval = 100) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkClerk = () => {
            attempts++;
            // Check for Clerk in multiple possible locations
            const clerkAvailable = typeof Clerk !== 'undefined' || 
                                   typeof window.Clerk !== 'undefined' ||
                                   (window.clerk && typeof window.clerk !== 'undefined');
            
            if (clerkAvailable) {
                console.log('Clerk SDK loaded successfully');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error('Clerk SDK failed to load after', maxAttempts, 'attempts');
                console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('clerk')));
                reject(new Error('Clerk SDK not available'));
            } else {
                setTimeout(checkClerk, interval);
            }
        };
        checkClerk();
    });
}

// Initialize Clerk
async function initClerk() {
    try {
        // Get the key at initialization time (not when file loads)
        const clerkPubKey = getClerkPubKey();
        
        console.log('Initializing Clerk...');
        console.log('Clerk key:', clerkPubKey ? clerkPubKey.substring(0, 20) + '...' : 'NOT SET');
        
        // Validate key
        if (!clerkPubKey || clerkPubKey === 'pk_test_your_publishable_key_here') {
            console.error('Clerk publishable key is not set or is using placeholder value!');
            const appDiv = document.getElementById('clerk-auth-container');
            if (appDiv) {
                appDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;"><p>Error: Clerk publishable key is not configured.</p><p style="font-size: 0.9em; color: #7f8c8d;">Please set CLERK_PUBLISHABLE_KEY in app.py</p></div>';
            }
            return;
        }

        // Wait for Clerk SDK to be available
        await waitForClerk();

        // Get Clerk constructor (check multiple possible locations)
        const ClerkConstructor = typeof Clerk !== 'undefined' ? Clerk : 
                                 typeof window.Clerk !== 'undefined' ? window.Clerk : null;

        if (!ClerkConstructor) {
            console.error('Clerk SDK not loaded. Please include Clerk script in your HTML.');
            return;
        }

        // Create new Clerk instance with the key
        // Clerk.js v5+ expects an options object with publishableKey
        console.log('Creating Clerk instance with key:', clerkPubKey.substring(0, 20) + '...');
        console.log('Full key length:', clerkPubKey.length);
        console.log('Key starts with pk_test?', clerkPubKey.startsWith('pk_test'));
        console.log('Key value:', clerkPubKey);
        
        // Try with options object format (recommended for v5+)
        try {
            console.log('Attempting: new Clerk({ publishableKey: key })');
            clerk = new ClerkConstructor({ publishableKey: clerkPubKey });
            console.log('Clerk instance created successfully with options object');
        } catch (e1) {
            console.log('Options object failed, trying string parameter...', e1);
            try {
                // Fallback to string parameter (older API)
                console.log('Attempting: new Clerk(key)');
                clerk = new ClerkConstructor(clerkPubKey);
                console.log('Clerk instance created successfully with string parameter');
            } catch (e2) {
                console.error('Both methods failed:', e2);
                throw new Error('Failed to create Clerk instance: ' + e2.message);
            }
        }
        
        // Load Clerk
        console.log('Loading Clerk...');
        await clerk.load();
        console.log('Clerk loaded successfully');

        // Check authentication status
        if (clerk.user) {
            console.log('User is signed in');
            handleSignedInUser();
        } else {
            console.log('User is not signed in, showing sign-in component');
            handleSignedOutUser();
        }

        // Set up event listeners
        setupClerkListeners();

    } catch (error) {
        console.error('Error initializing Clerk:', error);
        // Show error message in the container
        const appDiv = document.getElementById('clerk-auth-container');
        if (appDiv) {
            appDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;"><p>Error loading authentication. Please refresh the page.</p><p style="font-size: 0.9em; color: #7f8c8d;">' + error.message + '</p></div>';
        }
    }
}

// Handle signed in user
function handleSignedInUser() {
    const appDiv = document.getElementById('clerk-auth-container');
    if (appDiv) {
        appDiv.innerHTML = '<div id="user-button"></div>';
        const userButtonDiv = document.getElementById('user-button');
        if (userButtonDiv && clerk) {
            clerk.mountUserButton(userButtonDiv);
        }
    }

    // Update navigation
    updateNavigationForSignedIn();
}

// Handle signed out user
function handleSignedOutUser() {
    const appDiv = document.getElementById('clerk-auth-container');
    if (appDiv) {
        console.log('Mounting Sign In component...');
        appDiv.innerHTML = '<div id="sign-in"></div>';
        const signInDiv = document.getElementById('sign-in');
        if (signInDiv && clerk) {
            try {
                clerk.mountSignIn(signInDiv);
                console.log('Sign In component mounted successfully');
            } catch (error) {
                console.error('Error mounting Sign In component:', error);
            }
        } else {
            console.error('Sign In div or clerk instance not available');
        }
    } else {
        console.error('clerk-auth-container not found in DOM');
    }

    // Update navigation
    updateNavigationForSignedOut();
}

// Update navigation when signed in
function updateNavigationForSignedIn() {
    const loginLink = document.querySelector('a[href*="login"]');
    if (loginLink) {
        loginLink.style.display = 'none';
    }
}

// Update navigation when signed out
function updateNavigationForSignedOut() {
    const loginLink = document.querySelector('a[href*="login"]');
    if (loginLink) {
        loginLink.style.display = 'block';
    }
}

// Set up Clerk event listeners
function setupClerkListeners() {
    if (clerk) {
        clerk.addListener((event) => {
            if (event.type === 'user') {
                if (event.user) {
                    handleSignedInUser();
                } else {
                    handleSignedOutUser();
                }
            }
        });
    }
}

// Wait for Clerk key to be set
function waitForClerkKey(maxAttempts = 20, interval = 100) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkKey = () => {
            attempts++;
            const key = window.CLERK_PUBLISHABLE_KEY;
            if (key && key !== 'pk_test_your_publishable_key_here') {
                console.log('Clerk key found:', key.substring(0, 20) + '...');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error('Clerk key not found after', maxAttempts, 'attempts');
                reject(new Error('Clerk publishable key not set'));
            } else {
                setTimeout(checkKey, interval);
            }
        };
        checkKey();
    });
}

// Initialize when DOM is ready and Clerk SDK is loaded
async function startClerkInit() {
    try {
        // First, wait for the Clerk key to be set
        await waitForClerkKey();
        
        // Wait for Clerk SDK to be available (it might take a moment to load)
        await waitForClerk();
        
        // Small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Wait for both DOM and Clerk SDK
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Wait a bit more for Clerk SDK to fully initialize
                setTimeout(initClerk, 300);
            });
        } else {
            // DOM is ready, wait for Clerk SDK to fully initialize
            setTimeout(initClerk, 300);
        }
    } catch (error) {
        console.error('Failed to initialize Clerk:', error);
        const appDiv = document.getElementById('clerk-auth-container');
        if (appDiv) {
            appDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #e74c3c;"><p>Error: Clerk publishable key is not configured.</p><p style="font-size: 0.9em; color: #7f8c8d;">Please check app.py and ensure CLERK_PUBLISHABLE_KEY is set correctly.</p></div>';
        }
    }
}

// Start initialization
startClerkInit();

// Export for global access
window.medFriendClerk = {
    clerk: () => clerk,
    init: initClerk,
    isSignedIn: () => clerk && clerk.user !== null
};
