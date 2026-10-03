document.addEventListener(
    "DOMContentLoaded",
    () => {

        const forms =
            document.querySelectorAll(
                "form"
            );


        forms.forEach(form => {

            form.addEventListener(
                "submit",
                () => {

                    const button =
                        form.querySelector(
                            "button[type='submit']"
                        );


                    if (button) {

                        button.dataset.originalText =
                            button.innerText;

                        button.innerText =
                            "Please wait...";

                    }

                }
            );

        });

    }
);