import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the registration page
        page.goto("http://localhost:3000/register-item")

        # Step 1: URL Input
        # Use a known URL that should work
        url_input = page.get_by_placeholder("商品のURLを入力してください")
        expect(url_input).to_be_visible()
        url_input.fill("https://www.amazon.co.jp/dp/B08JJ5B4TA")

        # Click the fetch button
        page.get_by_role("button", name="商品情報を取得").click()

        # Wait for the details form to appear, indicating the fetch was successful
        expect(page.get_by_text("取得した商品情報")).to_be_visible(timeout=20000)

        # Take a screenshot of the product details form
        page.screenshot(path="jules-scratch/verification/01_product_details_form.png")

        # Step 2: Fill Details and Submit
        # The form should be pre-filled, but we can add tags
        tag_input = page.get_by_placeholder("タグを入力...")
        expect(tag_input).to_be_visible()
        tag_input.fill("テスト")
        page.get_by_role("button", name=re.compile(r"テスト.*")).click()

        # Click the update button
        page.get_by_role("button", name="商品情報を更新").click()

        # Step 3: Completion Screen
        # Wait for the completion message
        expect(page.get_by_text("商品情報の更新が完了しました")).to_be_visible(timeout=10000)

        # Take a screenshot of the completion screen
        page.screenshot(path="jules-scratch/verification/02_completion_screen.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)