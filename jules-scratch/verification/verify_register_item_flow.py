import re
from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Step 1: Navigate to the registration page
        page.goto("http://localhost:3000/register-item")
        page.screenshot(path="jules-scratch/verification/01_initial_page.png")

        # Step 2: Input URL and fetch product data
        url_input = page.get_by_placeholder("https://www.amazon.co.jp/dp/B08JJ5B1G2")
        expect(url_input).to_be_visible()
        url_input.fill("https://www.amazon.co.jp/dp/B08N52365Q") # A known product URL

        submit_button = page.get_by_role("button", name="商品情報を取得")
        submit_button.click()

        # Wait for the product details to load
        expect(page.get_by_text("取得した商品情報")).to_be_visible(timeout=20000)
        page.screenshot(path="jules-scratch/verification/02_product_details_loaded.png")

        # Step 3: Verify product details and interact with the form
        expect(page.get_by_label("商品名")).to_have_value(re.compile(r".+"))
        expect(page.get_by_label("価格")).to_have_value(re.compile(r"\d+"))

        # Check that the carousel is there
        expect(page.locator(".carousel .carousel-inner")).to_be_visible()

        # Toggle a feature
        feature_button = page.get_by_role("button", name="ほしい物リスト")
        expect(feature_button).to_have_attribute("aria-pressed", "false")
        feature_button.click()
        expect(feature_button).to_have_attribute("aria-pressed", "true")
        page.screenshot(path="jules-scratch/verification/03_feature_toggled.png")

        # Step 4: Interact with the tag input
        tag_input = page.get_by_placeholder("タグを検索...")
        tag_input.fill("便利")

        # Click a suggested tag
        suggested_tag = page.get_by_role("button", name="便利グッズ")
        expect(suggested_tag).to_be_visible()
        suggested_tag.click()

        # Verify the tag was added
        expect(page.get_by_role("button", name="便利グッズ ×")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/04_tag_added.png")

        # Step 5: Submit the product for creation
        create_button = page.get_by_role("button", name="商品を登録する")
        create_button.click()

        # Step 6: Verify the completion screen
        expect(page.get_by_text("商品登録が完了しました")).to_be_visible(timeout=15000)
        expect(page.get_by_role("heading", name="登録完了")).to_be_visible()
        page.screenshot(path="jules-scratch/verification/05_completion_screen.png")

        # Go back and register another product to test the reset flow
        back_button = page.get_by_role("button", name="続けて商品を登録する")
        back_button.click()

        # Verify the form is reset
        expect(page.get_by_placeholder("https://www.amazon.co.jp/dp/B08JJ5B1G2")).to_be_empty()
        expect(page.get_by_text("取得した商品情報")).not_to_be_visible()
        page.screenshot(path="jules-scratch/verification/06_form_reset.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)