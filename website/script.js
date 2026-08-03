const config = window.PPP_SITE_CONFIG ?? {}
const price = document.querySelector('#display-price')
const regularPrice = document.querySelector('#regular-price')
const foundingLimit = document.querySelector('#founding-limit')
const checkout = document.querySelector('.checkout-link')
const checkoutStatus = document.querySelector('.checkout-status')

if (price && config.price) price.textContent = config.price
if (regularPrice && config.regularPrice) regularPrice.textContent = config.regularPrice
if (foundingLimit && config.foundingLimit) foundingLimit.textContent = config.foundingLimit
if (checkout && config.checkoutUrl) {
  checkout.href = config.checkoutUrl
  checkout.rel = 'noopener'
} else if (checkout) {
  checkout.addEventListener('click', (event) => {
    event.preventDefault()
    if (checkoutStatus) checkoutStatus.textContent = 'Square checkout will connect here when the purchase link is ready.'
  })
}

document.querySelector('#year').textContent = String(new Date().getFullYear())

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) entry.target.classList.add('is-visible')
}, { threshold: 0.12 })

for (const element of document.querySelectorAll('.feature, .workflow-list li, .purchase-card')) observer.observe(element)
