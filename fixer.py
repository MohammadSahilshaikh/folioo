import os
import re

DIR = r"c:\files (2)"
os.chdir(DIR)

replacements = {
    # index.html
    "Portfolio website banwaiye. Demo pehle, payment baad me.": "Get your portfolio website. See the demo first, pay later.",
    "Hum aapki portfolio ya business website banate hain. 50% payment demo dekhne ke baad, 50% hosting ke time. Advance zero.": "We build your portfolio or business website. 50% payment after seeing the demo, 50% at hosting. Zero advance.",
    "Advance ₹0 — demo pehle": "Zero advance — see the demo first",
    'Aapki website banegi.<br>\n        Dekhne ke <span class="grad">baad</span> paisa dijiye.': 'Your website, built right.<br>\n        Pay only after you <span class="grad">approve</span> it.',
    "Hum pehle poori website ka live demo banate hain. Aap apne phone pe khol ke dekhte hain.\n        Pasand aaye to hi pehla payment.": "We build a fully working live demo of your website first. Open it on your phone and explore it.\n        Pay only if you love it.",
    "Live demos dekhein": "View live demos",
    "Payment do hisson me": "Payment in two simple halves",
    "Online kaam me sabse bada dar — paise de diye, kaam mila hi nahi.\n          Isliye humne payment ko kaam ke saath jod diya hai.": "The biggest fear with online work — you pay, and get nothing.\n          So we tied payment to progress.",
    "Order karte waqt": "When you order",
    "Form bhariye. Ek rupaya nahi lagta.": "Fill the form. Not a single rupee upfront.",
    "Demo dekhne ke baad": "After seeing the demo",
    "Live link milta hai. Khud dekhiye, pasand aaye to pehla 50%.": "You get a live link. Browse it yourself — pay 50% only if you like it.",
    "Hosting ke waqt": "At hosting",
    "Changes ho gaye, aap approve karte hain — tab baaki 50%.": "Changes done, you approve — then the remaining 50%.",
    "Demo dekhna free": "Demo is free",
    "Pasand na aaye to payment nahi": "No payment if you don't like it",
    "Demo pe unlimited changes": "Unlimited revisions on demo",
    "Domain-hosting cost pe zero markup": "Zero markup on domain & hosting costs",
    "Har plan pe wahi 50/50 payment. Koi hidden charge nahi.": "Every plan uses the same 50/50 payment. No hidden charges.",
    "Poora comparison dekhein": "See full comparison",
    "Ye screenshots nahi hain — sab khul jaati hain. Khud dekh lijiye.": "These aren't screenshots — they're real live websites. See for yourself.",
    "Saara kaam dekhein": "View all our work",
    "Clients kya kehte hain": "What our clients say",
    "Sab reviews real orders se.": "All reviews are from real orders.",
    "Sab reviews padhein": "Read all reviews",
    "Aksar puche jaane wale sawaal": "Frequently asked questions",
    "Jo yahan nahi mila, WhatsApp pe pooch lijiye.": "Didn't find your answer? Ask us on WhatsApp.",
    "Aaj order, parso demo": "Order today, get your demo in 2 days",
    "Abhi kuch pay nahi karna. Form bharne me 5 minute.": "Nothing to pay right now. Takes just 5 minutes to fill the form.",
    "Hi! Mujhe portfolio website banwani hai.": "Hi! I would like to get a portfolio website built.",
    "Plans load nahi hue": "Plans unavailable",
    "Page refresh karein, ya seedha pooch lein.": "Please refresh the page or ask us directly.",
    "WhatsApp pe poochhein": "Ask on WhatsApp",
    "Zyada log ye lete hain": "Most popular",
    "demo ke baad": "after demo",
    "hosting pe": "at hosting",
    "Ye plan chunein": "Choose this plan",
    "Demos jald aa rahe hain": "Demos coming soon",
    "Tab tak samples WhatsApp pe maang lijiye.": "Request sample websites on WhatsApp in the meantime.",
    "Samples maangein": "Request samples",
    "Demo kholein": "Open demo",
    "Pehla review aapka ho sakta hai": "Your review could be first",
    "Website live hone ke baad hum aapse review zaroor maangenge.": "We'll ask for your feedback after your site goes live.",
    "Demo dekhne ke liye kuch dena padta hai?": "Do I need to pay anything to see the demo?",
    "Nahi. Order se demo milne tak aapka kharcha ₹0 hai. Pehla payment tabhi jab aap demo dekh ke santusht ho jayein.": "No. Your total cost from ordering to seeing the demo is ₹0. First payment only after you see the demo and are satisfied.",
    "Demo pasand nahi aaya to?": "What if I don't like the demo?",
    "To aap kuch nahi dete. Pehle hum changes karte hain; phir bhi baat na bane to order cancel — koi charge nahi.": "You pay nothing. We'll first make revisions; if it still doesn't work for you, we cancel the order — no charges at all.",
    "Kitne changes kar sakte hain?": "How many revisions can I request?",
    "Demo stage pe unlimited. Live hone ke baad ek saal tak chhote text aur photo changes free.": "Unlimited during the demo stage. After going live, minor text and photo changes are free for one year.",
    "Domain aur hosting ka kharcha?": "What about domain and hosting costs?",
    "Domain ka actual cost aapka (~₹800/saal). Hum uspe markup nahi lete aur setup free karte hain. Hosting hamare plan me shamil hai.": "Domain at actual cost (~₹800/year). We add zero markup and set it up for free. Hosting is included in our plans.",
    "Mere paas CV nahi hai, phir bhi ban sakti hai?": "I don't have a CV — can you still build my site?",
    'Haan. Form me "content aap likh dijiye" option hai — hum 2–3 sawaal pooch ke likh dete hain.': 'Yes. The form has a "write content for me" option — we ask 2-3 questions and write it for you.',
    "Mera CV aur photo safe hai?": "Is my CV and photo safe with you?",
    "Wo sirf aapki website banane me use hote hain, kisi ke saath share nahi hote. Kaho to delete kar dete hain.": "They are used only to build your website and never shared with anyone. Ask us and we'll delete them.",
    
    # common.js / config.js
    "Copy ho gaya": "Copied successfully",
    "Copy nahi ho paya": "Copy failed",
    "Light ya dark mode": "Toggle light/dark mode",
    "Portfolio aur business websites. Demo pehle, payment baad me.": "Portfolio and business websites. See the demo first, pay later.",
    "WhatsApp pe baat karein": "Chat on WhatsApp",
    "WhatsApp pe poochhiye": "Chat on WhatsApp",
    "Internet connection nahi hai.": "No internet connection.",
    
    # supabase-client.js
    "Demo me hi samajh aa gaya ki site kaisi lagegi. Payment ke baad koi dikkat nahi aayi. Highly recommended!": "I understood exactly how the site would look from the demo. No issues after payment. Highly recommended!",
    "Sach me advance ₹0 tha. Demo 3 din me ready tha aur ekdum waise bana jaise maine bola tha.": "It really was ₹0 advance. The demo was ready in 3 days and was exactly what I asked for.",
    "Business site bani aur WhatsApp pe directly orders aane lage. Best investment tha.": "Got a business site and started getting orders directly on WhatsApp. Best investment.",
    "Very professional team. Ek hi revision me sab perfect ho gaya. Support bhi acha tha.": "Very professional team. Everything was perfect in just one revision. Support was good too.",
    "Campus placements ke liye portfolio banwaya. Interview me 3 companies ne site ki tariff ki!": "Got a portfolio built for campus placements. 3 companies praised the site during interviews!",
    "Pehle bahut dara tha online payment ka. Par ye log ne itna aasaan kar diya — demo pehle, paise baad me.": "I was very scared of online payments at first. But they made it so easy — demo first, money later.",
    
    # contact & forms
    "Hi! Mujhe kuch pooch na tha.": "Hi! I had a question.",
    "Hi! Mujhe website ke baare me baat karni hai.": "Hi! I want to discuss getting a website built.",
    "Bhej diya": "Message sent!",
    "Kripya highlighted fields check karein": "Please check the highlighted fields",
    "Bhej rahe hain…": "Sending...",
    "Message bhejein": "Send message",
    "WhatsApp pe connect kar rahe hain…": "Connecting you on WhatsApp...",
    "Message mil gaya! Hum jald reply karenge.": "Message received! We will reply shortly.",
    "Bhejne me dikkat hui — seedha WhatsApp try karein": "Error sending — please try WhatsApp directly",
    
    # order.js
    "Hi! Order form bharne me help chahiye.": "Hi! I need help with the order form.",
    "Plans load nahi hue. Page refresh karein.": "Plans unavailable. Please refresh the page.",
    "Kuch gadbad ho gayi — WhatsApp pe order bhej dijiye": "Something went wrong — please send your order via WhatsApp",
    "Order confirm karein": "Confirm order",
    "Hi! Mera order ready hai.": "Hi! My order is ready.",
    
    # thank-you.html
    "Order mil gaya!": "Order received!",
    "Hum 24 ghante ke andar WhatsApp pe contact karenge.": "We will contact you on WhatsApp within 24 hours.",
    "Aapki Tracking ID": "Your Tracking ID",
    "Hum aapki details dekh ke 3–5 din me demo banayenge": "We review your details and build the demo in 3–5 days",
    "Demo ready hote hi WhatsApp pe live link milega": "Once the demo is ready, you'll get a live link on WhatsApp",
    "Aap dekhenge, pasand aaye to pehla 50% payment": "You review it — if you love it, pay the first 50%",
    "Changes + approval ke baad website live — baaki 50%": "After final changes and your approval, the site goes live — then the remaining 50%",
    "WhatsApp pe update lein": "Get updates on WhatsApp",
    "Order track karein": "Track your order",
    "Aur demos dekhein": "See more demos",
    "Tracking ID copy ho gayi": "Tracking ID copied!",
    "Hi! Maine order kiya hai. Tracking ID:": "Hi! I placed an order. Tracking ID:",
    
    # order.html
    "5 minute me order karein. Advance ₹0. Demo dekhne ke baad hi pehla payment.": "Order in 5 minutes. Zero advance. First payment only after seeing the demo.",
    "Plan chunein": "Choose a plan",
    "Plan select karein": "Select a plan",
    "Plans load ho rahe hain...": "Loading plans...",
    "Kuch extras chahiye?": "Need any extras?",
    "Aage badhein": "Continue",
    "Aapke baare me": "About you",
    "Poora naam": "Full name",
    "Apne baare me kuch bataein...": "Tell us a bit about yourself...",
    "Peeche jayein": "Go back",
    "Upload fail ho gaya": "Upload failed",
    "Shehar (City)": "City",
    "Apne baare me thoda bataein...": "Tell us a bit about yourself...",
    "Top skills (comma se alag karein)": "Top skills (comma separated)",
    "Projects ke links (ek line me ek)": "Project links (one per line)",
    "Design kaisa chahiye?": "What kind of design do you prefer?",
    "Koi pasandida domain naam?": "Any preferred domain name?",
    "Aur kuch batana chahenge?": "Anything else you want to share?",
    "Mere paas content nahi hai, aap likh dijiye (+₹0)": "I don't have content, please write it for me (+₹0)",
    "Resume upload karein (PDF)": "Upload Resume (PDF)",
    "Profile photo (Optional)": "Profile photo (Optional)",
    "Clear photo jisme chehra saaf dikhe": "Clear photo where face is visible",
    
    # CSS Paddings & font weights
    "padding:clamp(52px,8vw,96px) 0": "padding:clamp(32px,5vw,64px) 0",
    "padding:clamp(28px,5vw,56px) 0": "padding:clamp(24px,5vw,48px) 0",
    "padding:44px 0": "padding:24px 0; \n  .card{padding:16px}\n  .hero{padding:24px 0 20px}\n",
    "padding:32px 0": "padding:24px 0; \n  .card{padding:16px}\n  .hero{padding:24px 0 20px}\n",
    "font-weight:800;": "font-weight:400;",
    "font-weight:600;": "font-weight:400;", # mostly applies to body/descriptions. H1/H2 will retain theirs.
    
    # other
    "Naam:": "Name:",
    "Naam": "Name",
    "Message": "Message",
    "Subject": "Subject",
    "WhatsApp number": "WhatsApp number",
}

def process_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Apply all exact string replacements
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    # Replace 'din' with 'days' carefully
    content = re.sub(r'\bdin\b', 'days', content)
    
    # Fix body font-weight specifically
    content = re.sub(r'body\{([^}]+)font-weight:400;', r'body{\1font-weight:400;', content)
    content = re.sub(r'body\{([^}]+)font-weight:[68]00;', r'body{\1font-weight:400;', content)

    # In HTML files, reduce mobile margin/padding inside media queries
    if filename.endswith(".html"):
        content = re.sub(r'@media \(max-width:767px\)\{([^\}]+)\.section\{padding:\d+px 0\}', r'@media (max-width:767px){\1.section{padding:24px 0}', content)
        # Ensure card padding is smaller on mobile
        if "@media (max-width:767px)" in content and ".card{padding:" not in content:
            content = content.replace("@media (max-width:767px){", "@media (max-width:767px){\n  .card{padding:16px}\n")

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

for f in os.listdir(DIR):
    if f.endswith(".html") or f.endswith(".js"):
        process_file(f)

print("All files updated successfully.")
