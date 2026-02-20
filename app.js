window.addEventListener("DOMContentLoaded",() => {
	const github = new IconButton("#github");
	const linkedin = new IconButton("#linkedin");
	const cv = new IconButton("#cv");
});

class IconButton {
	animClass = "icon-btn--animated";

	constructor(el) {
		this.el = document.querySelector(el);

		this.init();
	}
	init() {
		const events = ["focus", "mouseover", "touchstart"];
		events.forEach(ev => {
			this.el?.addEventListener(ev,this.iconAnimPlay.bind(this));
		});

		const animEndEl = this.el?.querySelector("[data-anim-end]");
		animEndEl?.addEventListener("animationend",this.iconAnimStop.bind(this));
	}
	iconAnimPlay() {
		this.el?.classList.add(this.animClass);
	}
	iconAnimStop() {
		this.el?.classList.remove(this.animClass);
	}
}
