    const form = document.getElementById("timeCalculator");
    const nextButton = document.getElementById("next");
    const backButton = document.getElementById("back");
    const hoursInput = document.getElementById("hoursPerDay");
    const ageInput = document.getElementById("birthdate");
    const ageStartInput = document.getElementById("ageStarted");
    const resultsScreen = document.getElementById("results");
    const resultsPage1 = document.getElementById("resultsPage1");
    const resultsPage2 = document.getElementById("resultsPage2");
    const screenDiv = document.getElementById("screen");
    const mainResult = document.getElementById("mainResult");
    const hoursResult = document.getElementById("totalHours");
    const yearsResult = document.getElementById("totalYears");
    const projection = document.getElementById("lifetimeProjection");
    const wakingHoursPercentage = document.getElementById("timePercentage");
    const startingAge = document.getElementById("page2ScreenStartAge");
    const resultsScroller = document.getElementById("resultsScroller");
    const resultsHeading = document.getElementById("resultsHeading");
    const page2Heading = document.getElementById("page2Heading");
    const calculatorHeading = document.getElementById("calculatorHeading");
    // error messages
    const hoursError = document.getElementById("avgHrsError");
    const birthdateError = document.getElementById("birthdateError");
    const ageSelectError = document.getElementById("ageSelectError");
    // saved time results elements
    const hoursSavedSlider = document.getElementById("hoursSavedSlider");
    const sliderValue = document.getElementById("sliderValue");
    const savedHoursResult = document.getElementById("savedHoursResult");
    const savedYearsResult = document.getElementById("savedYearsResult");
    const homeBar = document.getElementById("homeBar");
    const homeHint = document.getElementById("homeHint");
    const copyResultPage = document.getElementById("copyResult");
    const shareResultPage = document.getElementById("shareResult");
    const shareStatusMessage = document.getElementById("shareStatus");
    // mobile version of birthdate input
    const dateInput = document.getElementById("dateField");
    const dateError = document.getElementById("dateFieldError");

    let screenPercentage;
    let ageStarted;
    let dailyHours;
    let remainingYears;
    let savedDailyHours;
    let savedRemainingYears;
    let shareText = "";
    let seenScreen2 = false;

    // page 2 is never hidden, only translated off-screen, so keep it out of the
    // tab order until it is actually showing
    resultsPage2.inert = true;

    // UI cleanup incase browser doesn't support this function
    if (!navigator.share) {
        shareResultPage.style.display = "none";
    }
    function animateValue(element, start, end, duration, suffix) {
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = start + (end - start) * easedProgress;
            element.textContent = Math.floor(currentValue).toLocaleString() + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
            else {
                element.textContent = Number(end.toFixed(1)).toLocaleString() + suffix;

                savedDailyHours = dailyHours;
                savedRemainingYears = remainingYears;

                hoursSavedSlider.max = dailyHours;
                hoursSavedSlider.value = Math.min(1, dailyHours);
                updateSavedTime();
            }
        }

        requestAnimationFrame(update);
    }
    function updateSavedTime() {
        const reduction = Math.min(Number(hoursSavedSlider.value), savedDailyHours);

        const savedHours = reduction * savedRemainingYears * 365.25;
        const savedYears = savedHours / 24 / 365.25;

        if (reduction === 1) {
            sliderValue.textContent = "1 hour per day";
        }
        else {
            sliderValue.textContent = reduction + " hours per day";
        }

        savedHoursResult.textContent = Number(savedHours.toFixed(1)).toLocaleString() + " lifetime hours saved";
        savedYearsResult.textContent = Number(savedYears.toFixed(1)).toLocaleString() + " lifetime years returned";
    }

    async function copyResult(text, statusElement) {
        try {
            await navigator.clipboard.writeText(text);
            statusElement.textContent = "Copied.";
        } catch (error) {
            statusElement.textContent = "Copy failed.";
        }
    }
    async function shareResult(text, statusElement) {
        if (navigator.share) {
            try {
                await navigator.share({
                    text: text,
                    url: "https://screentime-mori.org/"
                });
                statusElement.textContent = "";
            } catch (error) {
                statusElement.textContent = "";
            }
        } else {
            statusElement.textContent = "Sharing isn't supported here.";
        }
    }

    dateInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, ""); // remove non-digits

        if (value.length > 2 && value.length <= 4) {
            value = value.slice(0, 2) + "/" + value.slice(2);
        } else if (value.length > 4) {
            value = value.slice(0, 2) + "/" + value.slice(2, 4) + "/" + value.slice(4, 8);
        }

        e.target.value = value;
    });

    function setError(input, errorElement, message) {
        errorElement.textContent = message;
        input.setAttribute("aria-invalid", "true");
        input.focus({ preventScroll: true });
    }
    function clearError(input, errorElement) {
        errorElement.textContent = "";
        input.removeAttribute("aria-invalid");
    }

    hoursInput.addEventListener("input", () => clearError(hoursInput, hoursError));
    ageInput.addEventListener("input", clearBirthdateErrors);
    dateInput.addEventListener("input", clearBirthdateErrors);
    ageStartInput.addEventListener("input", () => clearError(ageStartInput, ageSelectError));

    function getBirthdateValue() {
        const nativeDateValue = ageInput.value.trim();   // yyyy-mm-dd
        const textDateValue = dateInput.value.trim();    // mm/dd/yyyy

        // Prefer native date input if user filled it
        if (nativeDateValue) {
            const nativeDate = new Date(nativeDateValue + "T00:00:00");

            if (isNaN(nativeDate.getTime())) {
                return { value: null, error: "Please enter a valid birthdate." };
            }

            const today = new Date();
            if (nativeDate > today) {
                return { value: null, error: "Birthdate cannot be in the future!" };
            }

            return { value: nativeDateValue, error: "" };
        }

        // If text input is empty too
        if (!textDateValue) {
            return { value: "", error: "Please enter your birthdate." };
        }

        // Must match MM/DD/YYYY exactly
        const match = textDateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) {
            return { value: null, error: "Use MM/DD/YYYY." };
        }

        const month = Number(match[1]);
        const day = Number(match[2]);
        const year = Number(match[3]);

        // Basic year check
        if (year < 1000) {
            return { value: null, error: "Please enter a valid 4-digit year." };
        }

        // Month check
        if (month < 1 || month > 12) {
            return { value: null, error: "Month must be between 01 and 12." };
        }

        // Figure out max valid day for that month/year
        const daysInMonth = new Date(year, month, 0).getDate();

        if (day < 1 || day > daysInMonth) {
            return { value: null, error: "That day is not valid for that month." };
        }

        // Convert MM/DD/YYYY -> YYYY-MM-DD
        const normalizedValue =
            `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        // Build date safely and verify it didn't roll over
        const parsedDate = new Date(normalizedValue + "T00:00:00");

        if (
            isNaN(parsedDate.getTime()) ||
            parsedDate.getFullYear() !== year ||
            parsedDate.getMonth() + 1 !== month ||
            parsedDate.getDate() !== day
        ) {
            return { value: null, error: "Please enter a valid birthdate." };
        }

        const today = new Date();
        if (parsedDate > today) {
            return { value: null, error: "Birthdate cannot be in the future!" };
        }

        return { value: normalizedValue, error: "" };
    }

    function clearBirthdateErrors() {
        clearError(ageInput, birthdateError);
        clearError(dateInput, dateError);
    }

    function showBirthdateError(message) {
        const nativeHasValue = ageInput.value.trim() !== "";
        const textHasValue = dateInput.value.trim() !== "";

        clearBirthdateErrors();

        if (textHasValue && !nativeHasValue) {
            setError(dateInput, dateError, message);
        } else if (nativeHasValue) {
            setError(ageInput, birthdateError, message);
        } else if (ageInput.offsetParent !== null) {
            // neither field filled - target whichever one is actually visible,
            // the other is display:none at this breakpoint so focus would no-op
            setError(ageInput, birthdateError, message);
        } else {
            setError(dateInput, dateError, message);
        }
    }

    function validateForm() {
        // TODO: Move user validation logic here
    }

    form.addEventListener("submit", function(event) {
        event.preventDefault();
        clearError(hoursInput, hoursError);
        clearBirthdateErrors();
        clearError(ageStartInput, ageSelectError);

        const birthdateResult = getBirthdateValue();
        const birthdateValue = birthdateResult.value;

        if (birthdateResult.error) {
            showBirthdateError(birthdateResult.error);
            return;
        }

        // user input validation
        if (hoursInput.value === "" || !hoursInput.value) {
            setError(hoursInput, hoursError, "Hours per day cannot be blank.");
            return;
        }
        if (ageStartInput.value === "" || !ageStartInput.value) {
            setError(ageStartInput, ageSelectError, "Please enter age you started screentime.");
            return;
        }

        // ensure user inputs are numbers
        // this was a pain to figure out lol
        dailyHours = Number(hoursInput.value);
        ageStarted = Number(ageStartInput.value);

        // final input validation
        if (isNaN(dailyHours) || dailyHours < 0) {
            setError(hoursInput, hoursError, "Please enter a valid number.");
            return;
        }
        if (isNaN(ageStarted) || ageStarted < 0) {
            setError(ageStartInput, ageSelectError, "Please enter a valid number.");
            return;
        }

        // extreme edge case catch
        if (dailyHours > 23.5) {
            setError(hoursInput, hoursError, "You don't need anymore screen time💀, go to sleep.");
            return;
        }
        if (dailyHours > 20) {
            setError(hoursInput, hoursError, "Please enter a valid number, or get some rest if this is really your screentime.");
            return;
        }
        // age calculation logic
        const birthDate = new Date(birthdateValue);
        const today = new Date();
        // error prevention
        if (birthDate > today) {
            showBirthdateError("Birthdate cannot be in the future!");
            return;
        }
        let age = today.getFullYear() - birthDate.getFullYear();
        //adjust age if birthday hasn't passed yet for current year
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }
        // error prevention
        if (ageStarted > age) {
            setError(ageStartInput, ageSelectError, "Age started must be between 0 and your current age.");
            return;
        }

        // get exact time elapsed between now and screen start date
        const screenStartDate = new Date(birthDate);
        screenStartDate.setFullYear(screenStartDate.getFullYear() + ageStarted);
        // extreme edge case catch
        if (screenStartDate > today) {
            setError(ageStartInput, ageSelectError, "Screen-time start date cannot be in the future. But while you're there, give me Monday's" +
                " winning lottery numbers");
            return;
        }

        const msSinceStart = today - screenStartDate;
        const daysSinceStart = msSinceStart / (1000 * 60 * 60 * 24);
        // calculate total screen time
        let totalHours = dailyHours * daysSinceStart;
        let totalDays = totalHours / 24;
        let totalYears = totalHours / 24 / 365.25;

        // user's lifetime screen time projection
        const avgLifeSpan = 82;
        remainingYears = avgLifeSpan - ageStarted;
        const lifeTimeProjectionHours = dailyHours * remainingYears * 365.25;
        const lifeTimeProjectionYears = lifeTimeProjectionHours / 24 / 365.25;

        // calculate waking hours screentime percentage
        const wakingHoursSinceStart = 16 * daysSinceStart;
        screenPercentage = (totalHours / wakingHoursSinceStart) * 100;

        // assign user's saved potential time
        savedDailyHours = dailyHours;
        savedRemainingYears = remainingYears;
        hoursSavedSlider.max = dailyHours;
        hoursSavedSlider.value = Math.min(1, dailyHours);
        updateSavedTime();

        if (dailyHours && age && ageStarted) {
            animateValue(mainResult, 0, totalDays, 960, " days");
            hoursResult.textContent = (Number(totalHours.toFixed(1)).toLocaleString() + " total hours");
            yearsResult.textContent = (Number(totalYears.toFixed(1)).toLocaleString() + " total years");
            projection.textContent = ("If you continue this daily habit, you will spend " + Number(lifeTimeProjectionHours.toFixed(1)).toLocaleString() + " hours " +
                "or " + Number(lifeTimeProjectionYears.toFixed(1)).toLocaleString() + " years staring at a screen in your lifetime.");
            shareText = "I've spent " + Number(totalDays.toFixed(1)).toLocaleString() + " total days on screens. Check your time: https://screentime-mori.org/";

            screenDiv.style.opacity = '20';

            setTimeout(() => {
                screenDiv.style.display = 'none';
                resultsScreen.style.display = 'block';
                resultsHeading.focus({ preventScroll: true });
                resultsScreen.style.opacity = '1';
            }, 69);
            resultsScroller.style.transform = "translateY(0)";
        }
    })

    // share results
    copyResultPage.addEventListener("click", function() {
        copyResult(shareText, shareStatusMessage);
    });
    shareResultPage.addEventListener("click", function() {
        shareResult(shareText, shareStatusMessage);
    });

    hoursSavedSlider.addEventListener("input", updateSavedTime);
    // goto page 2
    nextButton.addEventListener("click", function(event) {
        seenScreen2 = true;
        event.preventDefault();

        wakingHoursPercentage.textContent = (Number(screenPercentage.toFixed(0)) + "% of your waking life");
        startingAge.textContent = ("on screens since age " + Number(ageStarted));

        resultsPage2.inert = false;
        resultsScroller.style.transform = "translateY(-50%)";
        page2Heading.focus({ preventScroll: true });
        resultsPage1.inert = true;
    })

    // back to page 1
    backButton.addEventListener("click", function(event) {
        event.preventDefault();

        resultsPage1.inert = false;
        resultsScroller.style.transform = "translateY(0)";
        resultsHeading.focus({ preventScroll: true });
        resultsPage2.inert = true;
    })

    homeBar.addEventListener("click", function() {
        if (seenScreen2) { homeHint.style.display = "none"; }
        // reset scroll position
        resultsScroller.style.transform = "translateY(0)";
        resultsPage1.inert = false;
        resultsPage2.inert = true;

        // animate results downward + fade
        resultsScreen.style.transform = "translateY(40px)";
        resultsScreen.style.opacity = "0";

        setTimeout(() => {
            resultsScreen.style.display = "none";
            resultsScreen.style.transform = "translateY(0)";

            screenDiv.style.display = "block";
            calculatorHeading.focus({ preventScroll: true });
            screenDiv.style.opacity = "0";

            // fade input back in
            setTimeout(() => {
                screenDiv.style.opacity = "1";
            }, 10);

        }, 300);

        // reset form + errors
        form.reset();
        clearError(hoursInput, hoursError);
        clearError(ageInput, birthdateError);
        clearError(dateInput, dateError);
        clearError(ageStartInput, ageSelectError);
        shareStatusMessage.textContent = "";
    });