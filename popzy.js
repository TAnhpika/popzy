// @ts-nocheck
class Popzy {
    static elements = [];

    constructor(options = {}) {
        if (!options.content && !options.templateId) {
            console.error("You must provide one of 'content' or 'templateId'.");
            return;
        }

        if (options.content && options.templateId) {
            options.templateId = null;
            console.warn(
                "Both 'content' and 'templateId' are specified. 'content' will take precedence, and 'templateId' will be ignored.",
            );
        }

        if (options.templateId) {
            this.template = document.querySelector(`#${options.templateId}`);

            if (!this.template) {
                console.error(`#${options.templateId} does not exist!`);
                return;
            }
        }

        this.opt = Object.assign(
            {
                enableScrollLock: true,
                cssClass: [],
                destroyOnClose: true,
                footer: false,
                closeMethods: ["button", "overlay", "escape"],
                scrollLockTarget: () => document.body,
            },
            options,
        );

        this.content = this.opt.content;

        const { closeMethods } = this.opt;
        // khi dùng _varName để đặt tên biến thì quy ước (giữa các devs) biến đó chỉ đc dùng trong hàm tạo. K dùng đối tướng sau khi tạo để gọi
        this._allowButtonClose = closeMethods.includes("button");
        this._allowBackdropClose = closeMethods.includes("overlay");
        this._allowEscapeClose = closeMethods.includes("escape");

        this._footerButtons = [];
    }

    _build() {
        const contentNode = this.content
            ? document.createElement("div")
            : this.template.content.cloneNode(true);

        if (this.content) {
            contentNode.innerHTML = this.content;
        }

        // Create modal elements
        this._backdrop = document.createElement("div");
        this._backdrop.className = "popzy";

        const container = document.createElement("div");
        container.className = "popzy__container";

        this.opt.cssClass.forEach((className) => {
            if (typeof className === "string") {
                container.classList.add(className);
            }
        });

        if (this._allowButtonClose) {
            const closeBtn = this.createButton(
                "&times;",
                "popzy__close",
                () => this.close(), // trong arrow function k có this riêng -> dùng this.template
            );

            container.append(closeBtn);
        }

        this._modalContent = document.createElement("div");
        this._modalContent.className = "popzy__content";

        // Append content and elements
        this._modalContent.append(contentNode);
        container.append(this._modalContent);

        if (this.opt.footer) {
            this._modalFooter = document.createElement("div");
            this._modalFooter.className = "popzy__footer";

            this.renderFooterContent();
            this.renderFooterButtons();

            container.append(this._modalFooter);
        }

        this._backdrop.append(container);
        document.body.append(this._backdrop);
    }

    setContent(content) {
        this.content = content;
        if (this._modalContent) {
            this._modalContent.innerHTML = this.content;
        }
    }

    setFooterContent(content) {
        this._footerContent = content;
        this.renderFooterContent();
    }

    addFooterButton(title, cssClass, callback) {
        const button = this.createButton(title, cssClass, callback);

        this._footerButtons.push(button);

        this.renderFooterButtons();
    }

    renderFooterContent() {
        // hỗ trợ thay đổi footer kể cả sau khi mở - sau này nút thay đổi nội dung sẽ hiện đc
        if (this._modalFooter && this._footerContent) {
            this._modalFooter.innerHTML = this._footerContent;
        }
    }

    renderFooterButtons() {
        // append khi đã hiện footer
        if (this._modalFooter) {
            this._footerButtons.forEach((button) => {
                this._modalFooter.append(button);
            });
        }
    }

    createButton(title, cssClass, callback) {
        const button = document.createElement("button");
        button.innerHTML = title;
        button.className = cssClass;
        button.onclick = callback;

        return button;
    }

    open() {
        Popzy.elements.push(this);

        if (!this._backdrop) {
            this._build();
        }
        setTimeout(() => {
            this._backdrop.classList.add("popzy--show");
        }, 0);

        // Disable scrolling
        if (this.opt.enableScrollLock) {
            const target = this.opt.scrollLockTarget();

            if (this._hasScrollbar(target)) {
                target.classList.add("popzy--no-scroll");
                const targetPadRight = parseFloat(
                    getComputedStyle(target).paddingRight,
                );
                target.style.paddingRight =
                    targetPadRight + this._getScrollbarWidth() + "px";
            }
        }

        if (this._allowBackdropClose) {
            this._backdrop.onclick = (e) => {
                if (e.target === this._backdrop) {
                    this.close();
                }
            };
        }

        if (this._allowEscapeClose) {
            document.addEventListener("keydown", this._handleEscapeKey);
        }

        this._onTransitionEnd(this.opt.onOpen);

        return this._backdrop;
    }

    _hasScrollbar(target) {
        if ([document.documentElement, document.body].includes(target)) {
            return (
                document.documentElement.scrollHeight >
                    document.documentElement.clientHeight ||
                document.body.scrollHeight > document.body.clientHeight
            );
        }
        return target.scrollHeight > target.clientHeight;
    }

    _handleEscapeKey = (e) => {
        // chỉ modal trên cùng mới đóng
        const lastPopzy = Popzy.elements[Popzy.elements.length - 1];
        if (e.key === "Escape" && this === lastPopzy) {
            this.close();
        }
    };

    _onTransitionEnd(callback) {
        this._backdrop.ontransitionend = (e) => {
            if (e.propertyName !== "transform") return;
            if (typeof callback === "function") callback();
        };
    }

    close(destroy = this.opt.destroyOnClose) {
        Popzy.elements.pop();
        // console.log(this); //button

        this._backdrop.classList.remove("popzy--show");

        if (this._allowEscapeClose) {
            document.removeEventListener("keydown", this._handleEscapeKey);
        }

        this._onTransitionEnd(() => {
            if (this._backdrop && destroy) {
                // fix: transition gọi 3 lần nhưng khi set null sẽ văng lỗi
                this._backdrop.remove();
                this._backdrop = null;
                this._modalFooter = null;
            }
            // Enable scrolling - khi đã đóng hết modal
            if (this.opt.enableScrollLock && !Popzy.elements.length) {
                const target = this.opt.scrollLockTarget();

                if (this._hasScrollbar(target)) {
                    target.classList.remove("popzy--no-scroll");
                    target.style.paddingRight = "";
                }
            }

            if (typeof this.opt.onClose === "function") this.opt.onClose();
        });
    }

    destroy() {
        this.close(true);
    }

    _getScrollbarWidth() {
        // k dùng arrow function vì this sẽ trỏ về window
        if (this._scrollbarWidth) return this._scrollbarWidth;

        const div = document.createElement("div");
        Object.assign(div.style, {
            overflow: "scroll",
            position: "absolute",
            top: "-9999px",
        });

        document.body.appendChild(div);
        this._scrollbarWidth = div.offsetWidth - div.clientWidth;
        document.body.removeChild(div);

        return this._scrollbarWidth;
    }
}
