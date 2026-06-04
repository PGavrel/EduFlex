import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        
        # Listen for console logs
        page.on("console", lambda msg: print(f"CONSOLE: [{msg.type}] {msg.text}"))
        
        # Listen for page errors
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        
        try:
            print("Navigating to http://127.0.0.1:8000 ...")
            await page.goto("http://127.0.0.1:8000", wait_until="networkidle", timeout=5000)
            print("Navigation finished.")
        except Exception as e:
            print(f"Exception during navigation: {e}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
