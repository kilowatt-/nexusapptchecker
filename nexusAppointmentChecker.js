/**
 * Script to repeatedly check for NEXUS appointments, will play an audio alert if one is available. If one is available, you will be redirected to the 
 * appointment booking page, where you'll have to book the appointment manually. Do it fast!
 * 
 * For use after you have been pre-approved for Nexus/GE.
 * 
 * Steps for use:
 * 
 * 1) Log on to https://ttp.cbp.dhs.gov
 * 2) Click "Schedule interview"
 * 3) Import this entire script into your browser"s devtools
 * 4) Type "checkForAppointment(centerId)" so if you want to check Sweetgrass, type "checkForAppointment(SWEETGRASS)". 
 * 5) OPTIONAL: For audio alerts, grant the "autoplay" permission in your browser
 * 
 * 
 * If you ever want to stop execution, type "keepCheckingForAppointment = false" in the console, or simply navigate away from the page
 */


const delay = ms => new Promise(res => setTimeout(res, ms));

const SPAN_ID_PREFIX = "centerDetails";

// ME
const CALAIS = "US00";
const HOULTON = "US01";

// MI
const DETROIT = "US10";
const DETROIT_NEXUS_FAST = "US11";
const PORT_HURON = "US12";
const SAULT_STE_MARIE = "US13";

// MN
const INTERNATIONAL_FALLS = "US20";
const WARROAD = "US21";

// MT
const SWEETGRASS = "US30";

// NY
const CHAMPLAIN = "US40";
const NIAGARA_FALLS_EC = "US41";
const NIAGARA_FALLS_NEXUS = "US42";
const OGDENSBURG = "US43";

// ND
const PEMBINA = "US50";

// VT
const DERBY_LINE = "US60";

// WA
const BLAINE = "US70";

// ON
const FORT_ERIE = "CA00";
const LANSDOWNE = "CA01";

const ALERT_AUDIO_URL = "https://media.geeksforgeeks.org/wp-content/uploads/20190531135120/beep.mp3";
const APPOINTMENTS_NOT_AVAILABLE = "Appointments not available for this location";

// Flag that one can set to "false" to manually stop checking for appointments
var keepCheckingForAppointment = true;

const checkAvailability = async () => {
    while (true) {
        const loading = document.getElementsByClassName("spinner-mask").length > 0;

        if (loading) {
            await delay(100);
            continue;
        } else {
            const nextAppointments = document.getElementsByClassName("nextAppointment");

            if (nextAppointments.length == 0) {
                throw new Error("Appointment didn't load");
            }

            const innerHtml = nextAppointments[0].innerHTML;

            if (innerHtml.includes(APPOINTMENTS_NOT_AVAILABLE)) {
                throw new Error(APPOINTMENTS_NOT_AVAILABLE);
            }

            return !innerHtml.includes("Appointments full thru");
        }
    }
}

/**
 * This method gets the DOM element of the "Schedule Appointment" button. Simply getting the element by ID doesn't work and defaults the enrollment center to
 * Calais, probably because of parent divs
 * 
 * @param {} centerId 
 */
const clickApptButton = async (centerId) => {
    const popOver = document.getElementById("popover" + centerId);
    const popOverContent = popOver.childNodes[0];
    const popOverContentBody = popOverContent.childNodes[2];
    const actionRow = getNodeByTypeAndClassOrId(popOverContentBody, "DIV", "actionRow", undefined);
    actionRow.firstChild.click();
}

const getNodeByTypeAndClassOrId = (node, type, className, id) => {
    let children = node.childNodes;

    for (let i = 0; i < children.length; i++) {
        let child = children[i];

        const classOrId = id ? child.id === id : child.className === className;

        if (child.tagName === type && classOrId) {
            return child;
        }
    }

    throw new Error("Could not find node.");
}

const playBeep = async () => {
    const audio = new Audio(ALERT_AUDIO_URL);

    for (i=0; i<5; i++) {
        audio.play();
        await delay(1000);
      }
}

const getDate = () => {
    const dateText = document.getElementsByClassName("date")[0].innerText;
    return new Date(dateText);
}

const getWeekOfMonth = (date) => {
    const dateOfMonth = date.getDate();
    const day = date.getDay();

    const weekOfMonth = Math.ceil((dateOfMonth - 1 - day) / 7);

    if (weekOfMonth === -0) {
        return 0;
    } else {
        return weekOfMonth;
    }
}

const getDateGeneralCalendarId = (date) => {
    const weekOfMonth = getWeekOfMonth(date);
    const dayOfMonth = date.getDay();
    const monthString = date.toLocaleString('en', { month: 'long' }).toUpperCase();
    return "GENERAL_REUSABLE.MONTHS." + monthString + weekOfMonth + "_" + dayOfMonth + "_" + date.getDate();
}

const clickSelectAppointmentButton = async (date) => {
    const dateGeneralCalendarId = getDateGeneralCalendarId(date);

    while (true) {
        const loading = document.getElementsByClassName("spinner-mask").length > 0;

        if (loading) {
            await delay(100);
            continue;
        } else {
            const dateElemId = "day" + dateGeneralCalendarId;
            const dateElem = document.getElementById(dateElemId);
            dateElem.click();

            // we can always choose the first date so no need to get DOM parents like we did earlier
            const chooseBtn = document.getElementById("btnChooseDate");
            chooseBtn.click();
            break;
        }
    }
}

const checkForAppointment = async (centerId) => {
    keepCheckingForAppointment = true;
    let errorCount = 0;
    while (keepCheckingForAppointment) {
        const spanId = SPAN_ID_PREFIX + centerId;

        document.getElementById(spanId).click();

        let apptAvailable;

        try {
            apptAvailable = await checkAvailability();
        } catch (e) {
            console.error(e);

            if (e.message === APPOINTMENTS_NOT_AVAILABLE) {
                console.log("This location is not accepting appointments, please choose another one.");
                keepCheckingForAppointment = false;
                break;
            }

            errorCount++;

            if (errorCount < 3) {
                console.error("Retrying");
            } else {
                console.error("Errored 3 times. Terminating execution");
                break;
            }
            continue;
        }

        errorCount = 0;

        if (apptAvailable) {
            const dateSpan = document.getElementsByClassName("date")[0];
            const date = new Date(dateSpan.innerText);
            keepCheckingForAppointment = false;
            clickApptButton(centerId);
            clickSelectAppointmentButton(date);
            playBeep();
            break;
        }

        if (!keepCheckingForAppointment) {
            console.log("Execution stopped");
            break;
        }

        await delay(1000);
        document.getElementById("popover" + centerId + "BtnClosePopover").click();
    }
};
