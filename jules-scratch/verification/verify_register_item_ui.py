from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the register item page
        page.goto("http://localhost:3000/register-item")
        page.wait_for_load_state('networkidle', timeout=10000)

        # Wait for the initial form to be visible
        expect(page.get_by_role("heading", name="Booth.pm 商品URL入力")).to_be_visible()

        # Input a valid BOOTH URL
        page.get_by_label("URL").fill("https://booth.pm/ja/items/3820463")

        # Click the fetch button
        page.get_by_role("button", name="商品情報を取得").click()

        # Wait for the product details form to appear
        expect(page.get_by_role("heading", name="商品情報の確認と登録")).to_be_visible(timeout=20000)

        # Verify that the new UI components are present
        expect(page.get_by_label("対象年齢")).to_be_visible()
        expect(page.get_by_label("カテゴリー")).to_be_visible()
        expect(page.get_by_label("主要機能")).to_be_visible()
        expect(page.get_by_label("その他のタグ")).to_be_visible()

        # Take a screenshot of the new UI
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)