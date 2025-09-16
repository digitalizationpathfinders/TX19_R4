class Stepper {
    constructor(stepSelector) {
        this.steps = Array.from(document.querySelectorAll(stepSelector));
        this.activeStep = this.steps.find(step => step.classList.contains('active'));
        this.observeStepContentChanges(); 

        this.stepHandlers = {}; // Store step instances
        this.updateStepNumbers();
        this.customStepCode(this.steps.indexOf(this.activeStep));
        
    }

    adjustMaxHeight(step) {
        if (!step) return;
        const stepContent = step.querySelector('.step-content');
        if (stepContent) {
            stepContent.style.maxHeight = stepContent.scrollHeight + 'px';
        }
    }

    setActive(step) {
        if (!step) return;

        if (this.activeStep) {
            
            this.activeStep.classList.remove('active');
            const stepContent = this.activeStep.querySelector('.step-content');
            if (stepContent) {
                stepContent.style.maxHeight = null;
            }
        }

        step.classList.add('active');
        this.activeStep = step;

        this.updateStepNumbers();
        this.customStepCode(this.steps.indexOf(this.activeStep));

        //this.adjustMaxHeight(step); //hiding this fixed the accordion issue, unknown other effects/imapcts though
    }

    updateStepNumbers() {
        this.steps.forEach((step, index) => {
            let stepNumberElement = step.querySelector('.step-number');
            if (!stepNumberElement) return;
    
            const isActive = step === this.activeStep;
            const isCompleted = index < this.steps.indexOf(this.activeStep);
    
            this.styleStepNumber(stepNumberElement, index, isActive, isCompleted);
        });
    }
    
    
    styleStepNumber(element, index, isActive, isCompleted) {
        element.style.backgroundColor = isActive || isCompleted ? "#26374A" : "#6F6F6F";
        element.style.color = "#FFFFFF";
    
        if (index === 0 && !isCompleted) {
            // First step gets the 'info' icon
            element.innerHTML = `<strong>i</strong>`;
        } else {
            // Other steps display their number
            element.innerHTML = isCompleted ? `<span class="material-icons">check</span>` : `${index}`;
        }
    }

    observeStepContentChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    this.adjustMaxHeight(this.activeStep); // ✅ Auto-adjust height when new elements are added
                }
            });
        });

        this.steps.forEach(step => {
            const stepContent = step.querySelector('.step-content');
            if (stepContent) {
                observer.observe(stepContent, { childList: true, subtree: true });
            }
        });
    }

    navigateStep(direction) {
        const currentIndex = this.steps.indexOf(this.activeStep);
        const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (targetIndex >= 0 && targetIndex < this.steps.length) {
           this.storeData(currentIndex);
            this.setActive(this.steps[targetIndex]);
        }
    }

    storeData(stepNum) {
        const stepForm = document.querySelector(`#step-${stepNum}-form`);
        let dataObj = {};
        const checkArr = [];
        if (stepForm) {
            stepForm.querySelectorAll("input, select, textarea").forEach(input => {
               
                if (input.type === "radio") {
                    if (input.checked) {
                        dataObj[input.name] = input.value;
                    }
                } 
                else if (input.type === "checkbox") {
                   
                    if (input.checked) {
                        checkArr.push(input.value);
                        dataObj[input.name] = checkArr;
                    }
                }
                else {
                    dataObj[input.name] = input.value;
                }
            });
        }
        if (stepNum === 3) {
            const handler = this.stepHandlers[stepNum];
            if (handler instanceof Step3Handler && handler.userLevel === 3) {
                handler.updateSingleLevel3Rep();
            }
        }
        if (stepNum === 4) {
            const fiscalDate = document.querySelector("#s4q2-field")?.value;
            const windupField = document.querySelector("#s4q3-field");
            const sameAsCheckbox = document.querySelector("#s4q3-op1");

            if (sameAsCheckbox && sameAsCheckbox.checked && fiscalDate) {
                // ✅ Store the actual fiscal date as windup date
                dataObj[windupField.name] = fiscalDate;
            } else if (windupField && windupField.value) {
                // ✅ Store whatever the user entered normally
                dataObj[windupField.name] = windupField.value;
            }
        }
   
    
        DataManager.saveData(`stepData_${stepNum}`, dataObj);
    }
    

    loadStoredData() {
        this.steps.forEach((step, index) => {
            let savedData = DataManager.getData(`stepData_${index}`);
            if (!savedData) return;

            Object.keys(savedData).forEach(key => {
                let input = step.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === "radio" || input.type === "checkbox") {
                        if (input.value === savedData[key]) {
                            input.checked = true;
                        }
                    } else {
                        input.value = savedData[key];
                    }
                }
            });
        });
    }

    customStepCode(stepNum){
        if (!this.stepHandlers[stepNum]) {
            switch (stepNum) {
                case 1:
                    this.stepHandlers[stepNum] = new Step1Handler(); 
                    break;
                case 2:
                    this.stepHandlers[stepNum] = new Step2Handler(); 
                    break;
                case 3:
                    this.stepHandlers[stepNum] = new Step3Handler(); 
                    break;
                case 4:
                    this.stepHandlers[stepNum] = new Step4Handler();
                    break;
                case 5:
                    this.stepHandlers[stepNum] = new Step5Handler();
                    break;
                case 6:
                    this.stepHandlers[stepNum] = new Step6Handler(this);
                    break;
            }
        }
    }
}
class Step1Handler {
    constructor(){
    }
}
class Step2Handler {
    constructor(){
        this.trustContainer = document.getElementById("trust-panel-container");
        this.account = DataManager.getData("accountInfo") || null;
        this.dodDatepicker = new DatepickerObj("s2q2-field");

        this.populateAccountPanel();
        
    }
    populateAccountPanel(){

        var shownData = { 
            name: this.account.name,
            trustType: this.account.trustType,
            trustNumber: this.account.trustNumber
        };

        new PanelObj({
            container: this.trustContainer,
            title: "Trust information on file",
            data: shownData,
            editButton: false, 
            editIndex: null,
            reviewPanel: false,
            labels: ["Estate of", "Trust type", "Trust account number"]
        })
    
    }
}
class Step3Handler {
    constructor() {
        this.userLevel = parseInt(DataManager.getData("userLevel")) || 2;
        this.legalReps = DataManager.getData("legalReps") || [];
        this.deceasedAddress = DataManager.getData("accountInfo").address;


        this.repPanelContainer = document.getElementById("legalrep-panel-container");
        this.addRepButton = document.querySelector('[data-togglelb="addlegalrep-lightbox"]');
        this.lightbox = new FormLightbox(document.getElementById("addlegalrep-lightbox"));

        this.noRepsAlert = document.getElementById("alert-norep");
        this.mailingAlert = document.getElementById("alert-mailing");
        this.repsQuestion = document.getElementById("s3q1-fieldset");
        this.repsTableFieldset = document.getElementById("s3q2-fieldset");
        this.legalRepInfoFieldset = document.getElementById("legalrepinfo-fieldset");
        this.legalRepAddressLBDiv = document.getElementById("s3-level3-address");
        this.legalRepAddressLBSpan = document.getElementById("s3-deceased-address");

        this.repsTable = new TableObj("tb-add-rep");
        this.firstRepAdded = false;

        this.lvl2repRoles = document.getElementById("s3-reprole-lb");
        this.lvl3repRoles = document.getElementById("s3-lvl3-reprole");
        const initialFlowType = DataManager.getData("accountInfo").flowType;
        if (initialFlowType) {
            this.updateRoleDropdowns(initialFlowType);
        }
        this.renderInitialView();
        this.setupListeners();
    }

   
    renderInitialView() {
        
        this.repPanelContainer.innerHTML = "";
        this.legalRepAddressLBSpan.innerHTML = this.deceasedAddress;


        // If userLevel 2 (no preloaded legal rep)
        if (this.userLevel === 2) {
            this.repsQuestion.classList.add("hidden");
            this.repsTableFieldset.classList.remove("hidden");

            const label = this.repsTableFieldset.querySelector('label');
            label.childNodes[1].nodeValue = "Provide information for the legal representative(s) of the deceased individual.";
            
            this.mailingAlert.classList.add("hidden");
            this.legalRepInfoFieldset.classList.add("hidden");
            //this.legalRepAddressLBDiv.classList.remove("hidden");
        }

        // If userLevel 3 and rep exists
        if (this.userLevel === 3) {
           
            this.firstRepAdded = true;
            this.renderPanel(this.legalReps[0], "Legal representative's information on file");
            this.repsQuestion.classList.remove("hidden");
            this.noRepsAlert.classList.add("hidden");
            this.legalRepAddressLBDiv.querySelector('strong').innerHTML = "A copy of the clearance certificate will be mailed to the following address:";    
           
        }
    
    }
    setupListeners() {
        document.addEventListener("lightboxSubmitted", (event) => {
            if (event.detail.lightboxId === "addlegalrep-lightbox") {
                this.handleFormSubmit(event.detail.formData);
            }
        });

        document.addEventListener("editRowEvent", (e) => {
            if (e.detail.tableID === "tb-add-rep") {
                this.lightbox.setEditIndex(e.detail.index);
                this.lightbox.populateForm(e.detail.rowData);
                this.lightbox.openLightbox();

        
            
            }
        });

        document.addEventListener("rowDeleted", () => {
            DataManager.saveData("legalReps", this.repsTable.rows);

            if (this.userLevel === 2 && this.repsTable.rows.length === 0) {
                this.legalRepAddressLBDiv.classList.remove("hidden");

            }
            if(this.repsTable.rows.length === 0){
                this.legalRepAddressLBDiv.querySelector('strong').innerHTML = "The clearance certificate will be mailed to the following address:";    

            }
        });

        document.querySelectorAll('input[name="s1q1"]').forEach(radio => {
            radio.addEventListener("change", (e) => {
                this.updateRoleDropdowns(e.target.id);
            })
        })
    }
    
    updateRoleDropdowns(flowType) {
        const options = {
            intervivos: `<option value="Trustee">Trustee</option><option value="Other">Other</option>`,
            testamentary:`<option value="Trustee">Trustee</option>
               <option value="Executor">Executor</option>
               <option value="Liquidator">Liquidator</option>
               <option value="Administrator">Administrator</option>
               <option value="Other">Other</option>`
        };
        this.lvl2repRoles.innerHTML = '<option value="" selected>(Select)</option>';
        this.lvl3repRoles.innerHTML = '<option value="" selected>(Select)</option>';
        const selected = flowType;
       
        this.lvl2repRoles.innerHTML += options[selected];
       this.lvl3repRoles.innerHTML += options[selected];
    }
    handleFormSubmit(formData) {
        const editIndex = this.lightbox.getEditIndex();
        const newRep = this.getNewRepFromForm(formData);
    
        this.updateRepsTable(newRep, editIndex);
        this.handlePostRepAddUI();
      
    }
    getNewRepFromForm(formData) {
        const fullName = `${formData["s3-repfname"]} ${formData["s3-replname"]}`.trim();
        return {
            name: fullName,
            role: formData["s3-reprole"],
            phone: formData["s3-reptel"],
            email: formData["s3-repemail"]
        };
    }
    updateSingleLevel3Rep() {
        const phoneInput = document.querySelector('#s3-lvl3-reptel');
        const emailInput = document.querySelector('#s3-lvl3-repemail');
        const roleSelect = document.querySelector('#s3-lvl3-reprole');
    
        if (!phoneInput || !roleSelect) return;
    
        const phone = phoneInput.value.trim();
        const role = roleSelect.value;
        const email = emailInput.value;
        
    
        this.legalReps[0].phone = phone || null;
        this.legalReps[0].role = role || null;
        this.legalReps[0].email = email || null;
    
        DataManager.saveData("legalReps", this.legalReps);
    }

    updateRepsTable(newRep, editIndex) {
        if (editIndex !== null && editIndex !== undefined && editIndex !== "") {
            this.legalReps[editIndex] = newRep;
            this.lightbox.clearEditIndex();
            this.repsTable.rows[editIndex] = { name: newRep.name, role: newRep.role };
            this.repsTable.refreshTable();
        } else {
            this.legalReps.push(newRep);
            this.repsTable.addRow({ name: newRep.name, role: newRep.role });
        }
        DataManager.saveData("legalReps", this.legalReps);
    }
    handlePostRepAddUI() {
        if (this.userLevel === 2 && this.legalReps.length > 0) {
            this.noRepsAlert.classList.add("hidden");
            this.legalRepAddressLBDiv.querySelector('strong').innerHTML = "A copy of the clearance certificate will be mailed to the following address:";    

          
            }
    
      
    }

    renderPanel(data, title) {
        new PanelObj({
            container: this.repPanelContainer,
            title,
            data,
            editButton: false,
            deleteButton: false,
            labels: ["Name", "Mailing address"]
        });
    }
   
}
class Step4Handler {
        constructor() {
        this.q3Lightbox = new FormLightbox(document.getElementById("s4q3-lightbox"));

        this.fiscalDatepicker = new DatepickerObj("s4q2-field");
        this.windupDatepicker = new DatepickerObj("s4q3-field");
        this.windupField = document.getElementById("s4q3-field");
        this.fiscalField = document.getElementById("s4q2-field");
        this.windupWrapper = document.getElementById("windup-wrapper");
        this.sameAsCheckbox = document.getElementById("s4q3-op1");
        this.sameAsCheckbox.addEventListener("click", ()=> {
            this.setWindupField(this.sameAsCheckbox.checked, this.windupWrapper);
            this.windupField.value = this.fiscalField.value;
        });

        this.fiscalField.addEventListener("dateSelected", (e) => {
            if(this.sameAsCheckbox.checked){
                this.windupField.value = e.detail.value;
            }
        })
    }
    
    setWindupField(disabled, wrapper){
        this.windupField.disabled = disabled;
        const input = wrapper.querySelector("input");
        const suffix = wrapper.querySelector(".suffix");

        if (disabled) {
            input.disabled = true;
            suffix.classList.add("disabled");
            suffix.style.pointerEvents = "none"; // prevent clicks
        } else {
            input.disabled = false;
            suffix.classList.remove("disabled");
            suffix.style.pointerEvents = "auto";
        }
    }  
}
class Step5Handler {
    constructor() {
        // this.submissionMethodRadios = document.querySelectorAll("#s5q2-fieldset input[type=radio]");
        // this.submittedDocsRadios = document.querySelectorAll("#s5q1-fieldset input[type=radio]");
        // this.submittedDocsRadios.forEach(radio => {
            
        //     radio.addEventListener("change", ()=>{
        //         if(radio.id === 's5q1-op1')
        //             this.addDataToggles("alert-warnsubdoc", "alert-infosubdoc")
        //         else 
        //            this.addDataToggles("alert-infosubdoc", "alert-warnsubdoc")
        //     })
        // })
        // this.haveSubmittedAllDocuments = document.getElementById("s5q1-op1");
        // this.haveSubmittedAllDocuments.addEventListener("click", ()=>{
        //     this.addDataToggles();
        // });
    }

    addDataToggles(oldToggle, newToggle){
        
        this.submissionMethodRadios.forEach(radio => {
            var currentToggle = radio.getAttribute("data-toggle").toString();
            
            var newToggleStr = currentToggle.replace(oldToggle, newToggle);

           radio.setAttribute("data-toggle", newToggleStr)
           if(oldToggle)
            document.getElementById(oldToggle).classList.add("hidden");
            
            
        })
        
    }

    
}
class Step6Handler {
    constructor(stepper) {
        this.stepper = stepper;
        this.reviewContainer = document.getElementById("s6-review-container");
        this.submitBtn = document.getElementById("appsubmit-btn");
        this.populateReview();

        // Listen for navigation events
        document.addEventListener("navigateToStep", (event) => {
            this.stepper.setActive(this.stepper.steps[event.detail.index]);
        });

        this.submitBtn.addEventListener('click', () => {
            sessionStorage.setItem("navigatingToConfirmation", "true");
            // Store necessary data in sessionStorage to retrieve on confirmation page
            sessionStorage.setItem("accountInfo", JSON.stringify(DataManager.getData("accountInfo")));
            sessionStorage.setItem("legalRepresentative", JSON.stringify(DataManager.getData("legalRepresentative")));
            sessionStorage.setItem("racUserName", JSON.stringify(DataManager.getData("racUserName")));
        
            // Redirect to confirmation page
            window.location.href = "confirmation_testamentary.html";
        });
    }

    populateReview() {
        this.reviewContainer.innerHTML = ""; // Clear previous content
    
        const steps = [
            { stepNum: 1, title: "Eligibility", storageKey: "stepData_1" },
            { stepNum: 2, title: "Estate trust information", storageKey: "stepData_2", labels: ["Estate of", "Trust type", "Trust account number", "Social insurance number", "Date of death"] },
            { stepNum: 3, title: "Representative's information", storageKey: "stepData_3" },
            { stepNum: 4, title: "Type of clearance", storageKey: "stepData_4" },
             { stepNum: 5, title: "Supporting documentation", storageKey: "stepData_5" },
        ];
        const accountInfo = DataManager.getData("accountInfo") || {};
        steps.forEach(({ stepNum, title, storageKey, labels }) => {
            let data = DataManager.getData(storageKey);
            if (!data) return; // Skip empty steps
    
           // Replace field names with question labels
           let formattedData = {};
           let subTableData = null; // Placeholder for subtable

            if(stepNum === 1) { 

            }
            if (stepNum === 2) {
                console.log(accountInfo)
            data = { ...accountInfo, ...data }; 
             //delete data.accountType;
           }
           if (stepNum === 3) {
               let legalReps = DataManager.getData("legalReps") || [];

            
               legalReps.forEach((rep, index) => {

                if(legalReps.length === 1) {
                    formattedData["Legal representative name"] = rep.name || "N/A";
                    formattedData["Legal representative mailing address"] = accountInfo.address;
                    formattedData[`Legal representative role`] = rep.role || "N/A";
                    formattedData["Legal representative email address"] = rep.email || "N/A"
                    formattedData["Legal representative telephone number"] = rep.phone || "N/A";
                   
                }
                else {
                    
                    const idx = index + 1;
                    formattedData[`Legal representative ${idx} name`] = rep.name || "N/A";
    
                    if(index === 0) {
                        formattedData[`Legal representative ${idx} mailing address`] = accountInfo.address;
                    }
    
                    formattedData[`Legal representative ${idx} role`] = rep.role || "N/A";
                    formattedData[`Legal representative ${idx} email address`] = rep.email || "N/A";
                    formattedData[`Legal representative ${idx} telephone number`] = rep.phone || "N/A";
                }
                

               });
           }
          

           if (stepNum !== 3) { // Avoid overwriting Step 3 data
               Object.keys(data).forEach((key, index) => {
                if(stepNum === 2) {
                    if(key === "address" || key === "flowType")
                        return;
                }

                   let questionLabel = labels && labels[index] ? labels[index] : this.getLabelForInput(key);
                   formattedData[questionLabel] = data[key]; // Assign label instead of raw key
                   if (stepNum === 4) {
                
                        Object.keys(data).forEach((key) => {
                        let label = this.getLabelForInput(key);
                        let value = data[key];
                    
                        if(key === "s4q2" || key === "s4q3"){
                            value = this.formatDate(value);
                        }
                     
                        formattedData[label] = value;
                        });
                    }
               });
           }
   
           // Generate panel for each step
           new PanelObj({
               container: this.reviewContainer,
               title: title,
               data: formattedData, // Use the formatted data with proper labels
               editButton: true,
               editIndex: stepNum,
               reviewPanel: true,
               subTable: subTableData
           });
       });
       
        // Listen for edit button clicks
        document.addEventListener("editPanelEvent", (event) => {
            this.stepper.setActive(this.stepper.steps[event.detail.index]);
        });
    }
    formatDate(value) {
        if (!value)
            return "N/A";
        const date = new Date(value);

        if (isNaN(date))
            return value;
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }


    getLabelForInput(name) {
    let label = "";

    // Handle standard <label for="...">
    const input = document.querySelector(`[name="${name}"]`);
    if (input) {
        const labelElement = document.querySelector(`label[for="${input.id}"]`);
        if (labelElement) {
            const cloned = labelElement.cloneNode(true);
            // Remove help links/icons and asterisks
            cloned.querySelectorAll('a, span, .label-ast').forEach(el => el.remove());
            label = cloned.textContent.trim();
        }
    }

    // Handle radio/checkbox inside a <fieldset>
    const fieldset = document.querySelector(`fieldset [name="${name}"]`);
    if (fieldset) {
        const legend = fieldset.closest("fieldset").querySelector("legend");
        if (legend) {
            const cloned = legend.cloneNode(true);
            // Remove help links/icons and asterisks
            cloned.querySelectorAll('a, span, .label-ast').forEach(el => el.remove());
            label = cloned.textContent.trim();
        }
    }

    // Final cleanup: remove any leftover asterisks or whitespace
    return label.replace(/^\*\s*/, "").trim() || name;
}

    
}

class PanelObj {
    constructor({ container, title, data, editButton = false, editIndex = null, deleteButton = false, reviewPanel = false, labels = null, subTable = null }) {
        this.container = container; // The DOM element where the panel should be appended
        this.title = title;
        this.data = data;
        this.editButton = editButton;
        this.editIndex = editIndex;
        this.deleteButton = deleteButton;
        this.reviewPanel = reviewPanel;
        this.labels = labels; // Store optional labels
        this.subTable = subTable;

        this.render();
    }

    render() {

        this.panelElement = document.createElement("div");
        this.panelElement.classList.add("panel");

        let editButtonHTML = this.editButton ? 
            `<button type="button" class="btn-tertiary edit-btn" data-index="${this.editIndex}"><span class="material-icons">edit</span>Edit</button>` : "";

        let deleteButtonHTML = this.deleteButton ? 
        `<button type="button" class="btn-tertiary delete-btn" data-index="${this.editIndex}"><span class="material-icons">delete</span>Delete</button>` : "";
        // Generate table rows for main data
        let tableRows = Object.entries(this.data)
            .map(([key, value], index) => {
                if(value) {
                    let label = this.labels && this.labels[index] ? this.labels[index] : this.formatKey(key);
                    return `<tr><td class="label">${label}</td><td>${value}</td></tr>`;
                }
               
            })
            .join("");

        let subTableHTML = "";

        // Generate sub-table dynamically if data is provided
        if (this.subTable && this.subTable.rows && this.subTable.rows.length > 0) {
            subTableHTML = `
                <h5>${this.subTable.title || "Subtable"}</h5>
                <table class="review-table" cellpadding="0" cellspacing="0">
                    <thead>
                        <tr>
                            ${this.subTable.headers.map(header => `<th>${header}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.subTable.rows.map(row => `
                            <tr>
                                ${this.subTable.columns.map(column => `<td>${row[column] || "N/A"}</td>`).join("")}
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        }

        this.panelElement.innerHTML = `
            <div class="heading-row">
                <h5>${this.title}</h5>
                <div>
                ${editButtonHTML}
                ${deleteButtonHTML}
                </div>
                
            </div>
            <table class="panel-data">
                ${tableRows}
            </table>
            <div>

            ${subTableHTML} <!-- Dynamically insert sub-table if applicable -->
                        </div>

        `;

        this.container.appendChild(this.panelElement);

        const editButton = this.panelElement.querySelector(".edit-btn");

        if (editButton) {
            editButton.addEventListener("click", () => this.emitEditEvent());
        }
        const deleteButton = this.panelElement.querySelector(".delete-btn");

        if(deleteButton){
            deleteButton.addEventListener("click", () => this.emitDeleteEvent());
        }
    }

    formatKey(key) {
        return key
            .replace(/([A-Z]{2,})/g, match => match) // Keep acronyms like SIN intact
            .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert spaces only between words
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
    }

    emitEditEvent() {
        if (this.reviewPanel) {
            document.dispatchEvent(new CustomEvent("navigateToStep", {
                detail: { index: this.editIndex }
            }));
        } else {
            document.dispatchEvent(new CustomEvent("editPanelEvent", {
                detail: { index: this.editIndex, panelTitle: this.title, panelData: this.data }
            }));
        }
    }
    emitDeleteEvent() {
        document.dispatchEvent(new CustomEvent("deletePanelEvent", {
            detail: { index: this.editIndex, panelTitle: this.title }
        }));
    }
}

class TableObj {
    constructor (tableID) {
        this.table = document.getElementById(tableID);
        this.tbody = this.table.querySelector("tbody");
        this.defaultText = this.tbody.dataset.placeholder;
        this.columnCount = this.table.querySelector("thead tr").children.length;
        this.rows = []; // Store data for easier access

       // Initialize the table with placeholder text if empty
       this.renderEmptyTable();
    }
    renderEmptyTable() {
        this.tbody.innerHTML = `<tr><td colspan="${this.columnCount + 1}" style="text-align:center;">${this.defaultText}</td></tr>`;
    }
    addRow(data, rowIndex = this.rows.length) {
        // If the table is displaying the default placeholder row, clear it
        if (this.tbody.querySelector("tr") && this.tbody.querySelector("tr").cells.length === 1) {
            this.tbody.innerHTML = "";
        }
        this.rows[rowIndex] = data; // Ensure correct index assignment

        // Create a new row
        const tr = document.createElement("tr");

        // Populate row with data
        Object.values(data).forEach((value) => {
            const td = document.createElement("td");
            td.textContent = value || "N/A"; // Handle empty fields
            tr.appendChild(td);
        });

        // Actions column (placeholder for buttons)
        const actionTd = document.createElement("td");
        actionTd.innerHTML = `
            <button type="button" class="btn-tertiary edit-btn" data-index="${rowIndex}"><span class="material-icons">edit</span>Edit</button>
            <button type="button" class="btn-tertiary delete-btn" data-index="${rowIndex}"><span class="material-icons">close</span>Delete</button>
        `;
        tr.appendChild(actionTd);

        // Append row to table
        this.tbody.appendChild(tr);

        // Attach event listeners
        actionTd.querySelector(".edit-btn").addEventListener("click", (event) => {
            this.emitEditEvent(event.target.closest(".edit-btn").dataset.index);
        });

        actionTd.querySelector(".delete-btn").addEventListener("click", (event) => {
            this.deleteRow(event.target.closest(".delete-btn").dataset.index);
        });

    }

    emitEditEvent(index) {
        index = parseInt(index);
        if (!this.rows[index]) return;

        // Dispatch an event so Step5Handler (or other handlers) can respond
        document.dispatchEvent(new CustomEvent("editRowEvent", {
            detail: {
                tableID: this.table.id,
                index: index,
                rowData: this.rows[index]
            }
        }));
    }
    deleteRow(index) {
        index = parseInt(index);
        this.rows.splice(index, 1);
        this.refreshTable();

        document.dispatchEvent(new CustomEvent("rowDeleted"));
    }

    refreshTable() {
        this.tbody.innerHTML = ""; // Clear the table
    
        if (this.rows.length === 0) {
            this.renderEmptyTable();
            return;
        }
    
        this.rows.forEach((rowData, index) => {
            this.addRow(rowData, index);
        });
    }
}

class DatepickerObj {
    constructor(inputId) {
        this.input = document.getElementById(inputId);
        this.wrapper = this.input.closest(".input-wrapper");
        this.icon = this.wrapper.querySelector(".suffix");
        this.modal = this.wrapper.querySelector(".datepicker-modal");

         // Open on icon click
        this.icon.addEventListener("click", (e) => {
            e.stopPropagation();
            DatepickerObj.closeAll(); // Close other open ones
            this.open();
        });

        // Close if clicking outside
        document.addEventListener("click", (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }
    open(){
        const today = new Date();
        this.selectedYear = today.getFullYear();
        this.selectedMonth = today.getMonth();
        this.renderDayView(this.selectedYear, this.selectedMonth);
        this.modal.classList.remove("hidden");
        // Prevent clicks inside the modal from closing it
        this.modal.addEventListener("click", (e) => e.stopPropagation());

        // Mark this step-content as open
        const stepContent = this.wrapper.closest(".step-content");
        if (stepContent) stepContent.classList.add("modal-open");
    }
    close(){
        this.modal.classList.add("hidden");
         const stepContent = this.wrapper.closest(".step-content");
        if (stepContent) stepContent.classList.remove("modal-open");
    }
    
    static closeAll() {
        document.querySelectorAll(".datepicker-modal").forEach(modal => {
            modal.classList.add("hidden");
        });
    }
    renderDayView(year, month) {
        this.modal.innerHTML = "";

        const container = document.createElement("div");
        container.classList.add("datepicker-grid");

        // Header
        const header = document.createElement("div");
        header.classList.add("datepicker-header");

       // Left: title + dropdown
        const left = document.createElement("div");
        left.classList.add("datepicker-header-left");

        const title = document.createElement("button");
        title.classList.add("datepicker-title-btn");
        title.innerHTML = `${this.getMonthName(month)} ${year} <span class="arrow">▼</span>`;
        title.onclick = () => this.renderYearRange(year - (year % 24));
        left.appendChild(title);

        // Right: arrows
        const right = document.createElement("div");
        right.classList.add("datepicker-header-right");

        const prev = document.createElement("span");
        prev.innerHTML = "&lsaquo;";
        prev.classList.add("datepicker-nav");
        prev.onclick = () => {
        const newMonth = month === 0 ? 11 : month - 1;
        const newYear = month === 0 ? year - 1 : year;
        this.selectedYear = newYear;
        this.selectedMonth = newMonth;
        this.renderDayView(newYear, newMonth);
        };

        const next = document.createElement("span");
        next.innerHTML = "&rsaquo;";
        next.classList.add("datepicker-nav");
        next.onclick = () => {
        const newMonth = month === 11 ? 0 : month + 1;
        const newYear = month === 11 ? year + 1 : year;
        this.selectedYear = newYear;
        this.selectedMonth = newMonth;
        this.renderDayView(newYear, newMonth);
        };

        right.appendChild(prev);
        right.appendChild(next);

        // Final header assembly
        header.appendChild(left);
        header.appendChild(right);
        container.appendChild(header);

        // Weekday headers
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdayRow = document.createElement("div");
        weekdayRow.classList.add("day-row");
        weekdays.forEach(d => {
            const day = document.createElement("div");
            day.classList.add("day-name");
            day.textContent = d;
            weekdayRow.appendChild(day);
        });
        container.appendChild(weekdayRow);

        // Day cells
        const grid = document.createElement("div");
        grid.classList.add("day-grid");

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement("div");
            empty.classList.add("day-cell", "empty");
            grid.appendChild(empty);
        }

        for (let i = 1; i <= totalDays; i++) {
            const cell = document.createElement("div");
            cell.classList.add("day-cell");
            cell.textContent = i;
            cell.onclick = () => this.selectDate(year, month, i);
            grid.appendChild(cell);
        }

        container.appendChild(grid);
        this.modal.appendChild(container);
    }

    renderYearRange(startYear = this.getCurrent24Start()) {
        this.modal.innerHTML = ""; // Clear modal

        const container = document.createElement("div");
        container.classList.add("datepicker-grid");

        // Header
        const header = document.createElement("div");
        header.classList.add("datepicker-header");

        const prev = document.createElement("span");
        prev.innerHTML = "&lsaquo;";
        prev.classList.add("datepicker-nav");
        prev.onclick = () => this.renderYearRange(startYearAdjusted - 24);

        const title = document.createElement("div");
        title.classList.add("datepicker-title");
        title.textContent = `${startYear} - ${startYear + 23}`;

        const next = document.createElement("span");
        next.innerHTML = "&rsaquo;";
        next.classList.add("datepicker-nav");
        
        //next.onclick = () => this.renderYearRange(startYear + 24);
        next.style.visibility = "hidden";
        header.appendChild(prev);
        header.appendChild(title);
        header.appendChild(next);
        container.appendChild(header);

        // Year grid
        const grid = document.createElement("div");
        grid.classList.add("year-grid");

        const currentYear = new Date().getFullYear();
        const endYear = currentYear;
        const startYearAdjusted = endYear - 23;

        for (let i = 0; i < 24; i++) {
            const year = startYearAdjusted + i;
            const cell = document.createElement("div");
            cell.classList.add("datepicker-cell");
            cell.textContent = year;

            // Only enable if it's <= current year
            cell.classList.add("clickable");
            cell.onclick = () => this.handleYearClick(year);

            grid.appendChild(cell);
        }
        title.textContent = `${startYearAdjusted} - ${endYear}`;


        container.appendChild(grid);
        this.modal.appendChild(container);
    }

    renderMonthView(year) {
    this.modal.innerHTML = ""; // Clear modal

    const container = document.createElement("div");
    container.classList.add("datepicker-grid");

    // Header with back arrow and year label
    const header = document.createElement("div");
    header.classList.add("datepicker-header");

    const back = document.createElement("span");
    back.innerHTML = "&lsaquo;";
    back.classList.add("datepicker-nav");
    back.onclick = () => this.renderYearRange(this.getCurrent24Start(year));

    const title = document.createElement("div");
    title.classList.add("datepicker-title");
    title.textContent = year;

    header.appendChild(back);
    header.appendChild(title);
    container.appendChild(header);

    // Month grid
    const grid = document.createElement("div");
    grid.classList.add("month-grid");

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    monthNames.forEach((name, index) => {
        const cell = document.createElement("div");
        cell.classList.add("datepicker-cell");
        cell.textContent = name;
        cell.onclick = () => {
            this.selectedMonth = index;
            this.renderDayView(year, index);
        };
        grid.appendChild(cell);
    });

    container.appendChild(grid);
    this.modal.appendChild(container);
    }

    getCurrent24Start(current = new Date().getFullYear()) {
        return current - 23;
    }
    handleYearClick(year) {
        this.selectedYear = year;
        this.renderMonthView(year); // Call month view after picking a year
    }
    selectDate(year, month, day) {
        const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        this.input.value = formatted;
        this.input.dispatchEvent(new CustomEvent('dateSelected', {
            detail: { value: this.input.value}
        }));
        this.modal.classList.add("hidden");
    }

    getMonthName(index) {
        return ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"][index];
    }



}

class DataManager {
    static saveData(key, value) {
        sessionStorage.setItem(key, JSON.stringify(value));
        document.dispatchEvent(new CustomEvent("dataUpdated", { detail: { key, data: value } }));
    }
    static appendToArray(key, newValue) {
        let existingData = DataManager.getData(key) || [];
        if (!Array.isArray(existingData)) existingData = []; // Ensure it's an array
        existingData.push(newValue);
        DataManager.saveData(key, existingData);
    }

    static getData(key) {
        let data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    static clearData(key) {
        sessionStorage.removeItem(key);
    }
}

class FormLightbox {
    constructor(lightbox){
        this.lightbox = lightbox;
        this.form = this.lightbox.querySelector('form');
        this.openTrigger = document.querySelector(`[data-togglelb="${lightbox.id}"]`);
        this.submitButton = this.lightbox.querySelector('[data-submit]');
        this.editIndex = null;
       
        if(this.openTrigger){
            this.openTrigger.addEventListener('click', () => {
                this.openLightbox();
                this.clearFormData();
            });
            if(this.openTrigger.value){
                var buttonText = document.createTextNode(this.openTrigger.value);
                this.openTrigger.appendChild(buttonText)
            } 
        }
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        this.lightbox.querySelectorAll('[data-closebtn]').forEach(btn => {
            btn.addEventListener('click', () => this.closeLightbox());
        });

        if (this.submitButton) {
            this.submitButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.sendFormData();
                
            });
        }
    }
    openLightbox() {
        this.lightbox.classList.add('open');
    }

    closeLightbox() {
        this.lightbox.classList.remove('open');
        this.clearEditIndex();
    }

    clearFormData() {
        if (!this.form) return;
        this.form.querySelectorAll("input, select, textarea").forEach(input => {
            if (input.type === "checkbox" || input.type === "radio") {
                input.checked = false;
            } else {
                input.value = "";
            }
        });
        let hiddenEls = this.form.querySelectorAll("[data-inithidden]");
        if(hiddenEls.length > 0){
            hiddenEls.forEach(el => {
                el.classList.add("hidden");
            })
        }
        // Reset spans with data-formelement
        this.form.querySelectorAll("[data-formelement]").forEach(span => {
        span.textContent = span.dataset.placeholder || "";
        });
    }

    populateForm(data) {
        if (!this.form) return;
        Object.keys(data).forEach((key) => {
            const input = this.form.querySelector(`[name="${key}"]`);
            if (input) input.value = data[key];
        });
    }

    sendFormData() {
        const formData = new FormData(this.form);
        let dataObj = {};
    
        formData.forEach((value, key) => {
            dataObj[key] = value;
        });
        
        document.dispatchEvent(new CustomEvent("lightboxSubmitted", {
            detail: {
                lightboxId: this.lightbox.id,
                formData: dataObj
            }
        }));
    
        this.closeLightbox();
    }
    
    setEditIndex(index) {
        this.editIndex = index;
    }

    getEditIndex() {
        return this.editIndex;
    }
    clearEditIndex() {
        this.editIndex = null;
    }
}

class ProgressiveDisclosure {
    constructor(stepperInstance = null) {
        this.stepper = stepperInstance; // Optionally pass the stepper instance
        this.initializeEventListeners();
        this.outConditions = [
            //step 1 selections that result in an "out"
            ["s1q1-op2"],
            ["s1q2-op2"], 
            ["s1q3-op2"],
            ["s1q4-op2"]
        ];
        
    }

    initializeEventListeners() {
        // Attach change event to all elements with the `data-toggle` attribute
        document.querySelectorAll('[data-toggle], input[type="radio"], input[type="checkbox"], input[type="select"]').forEach(input => {
            input.addEventListener('change', this.handleInputChange.bind(this));
            
        });

    }
    handleInputChange(event) {
        this.handleToggle(event); // Ensure Progressive Disclosure still works
        this.outCheck(); // Check if the user should be redirected
    }

    handleToggle(event) {
        const input = event.target;
        const toggleTargets = input.getAttribute('data-toggle');

        // Hide all sibling toggle targets in the same group
        this.hideOtherTargets(input);

        // If the current input has a data-toggle, handle its targets
        if (toggleTargets) {
            const targetIds = toggleTargets.split(',').map(id => id.trim());
            targetIds.forEach(targetId => {
                const targetElement = document.getElementById(targetId);
                if (!targetElement) {
                    console.error(`Element with ID '${targetId}' not found.`);
                    return;
                }

                //if (input.checked) {
                if((input.tagName ===  'INPUT' && input.checked) || (input.tagName === 'SELECT' && input.value)){
                    targetElement.classList.remove('hidden');
                }
            });
        }

        // Adjust stepper height if available
        if (this.stepper) {
            const currStep = this.stepper.activeStep;
            this.stepper.adjustMaxHeight(currStep);
        }
    }


    hideOtherTargets(input) {
    const groupName = input.name;

    if (groupName) {
        const groupInputs = document.querySelectorAll(`input[name="${groupName}"]`);

        groupInputs.forEach(groupInput => {
            const otherTargets = groupInput.getAttribute('data-toggle');

            if (otherTargets) {
                const targetIds = otherTargets.split(',').map(id => id.trim());

                targetIds.forEach(targetId => {
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        this.hideWithSubfields(targetElement);
                    }
                });
            }
        });

        // ✅ NEW: Hide all subsequent fieldsets if the current input triggers an out
        const parentFieldset = input.closest("fieldset");
        if (parentFieldset && parentFieldset.classList.contains("hidden")) {
            let nextFieldset = parentFieldset.nextElementSibling;
            while (nextFieldset) {
                if (nextFieldset.tagName === "FIELDSET") {
                    this.hideWithSubfields(nextFieldset);
                }
                nextFieldset = nextFieldset.nextElementSibling;
            }
        }
    }
}


hideWithSubfields(element) {
    element.classList.add("hidden");

    // Clear all inputs inside the hidden element
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });

    // Recursively hide any nested fields inside this element
    const nestedToggles = element.querySelectorAll('[data-toggle]');
    nestedToggles.forEach(nestedToggle => {
        const nestedTargets = nestedToggle.getAttribute('data-toggle');
        if (nestedTargets) {
            nestedTargets.split(',').forEach(nestedTargetId => {
                const nestedTargetElement = document.getElementById(nestedTargetId.trim());
                if (nestedTargetElement) {
                    this.hideWithSubfields(nestedTargetElement);
                }
            });
        }
    });
}

    outCheck (){
        let selectedInputs = Array.from(document.querySelectorAll('input:checked')).map(input => input.id);
    
        let isOut = this.outConditions.some(conditionSet => conditionSet.every(id => selectedInputs.includes(id)));
    
        this.updateNavigationButtons(isOut);
    
    }
    
    updateNavigationButtons(isOut) {
        const activeStep = document.querySelector('.step.active'); // Get the current active step
        if (!activeStep) return;

        const nextBtn = activeStep.querySelector('.next-button');
        const backBtn = activeStep.querySelector('.back-button');
        const outBtn = activeStep.querySelector('.out-button');

        if (!outBtn) return; // If no next button is found, exit

        if (isOut) {
            nextBtn.classList.add("hidden");
            backBtn.classList.add("hidden");

            outBtn.classList.remove("hidden");
           
        } else {
            nextBtn.classList.remove("hidden");
            backBtn.classList.remove("hidden");

            outBtn.classList.add("hidden");
        }
    }
    
}

document.addEventListener('DOMContentLoaded', () => {

    let taskData = sessionStorage.getItem("selectedTask");

    if (!taskData) {
        // If user somehow lands here without choosing a task, redirect them back
        window.location.href = "chooser.html";
    } else {
        taskData = JSON.parse(taskData);
        console.log("Loaded Task Data:", taskData);

        // Store data for use in other scripts
        DataManager.saveData("accountInfo", taskData.accountInfo);
        DataManager.saveData("userLevel", taskData.userLevel);

        if (taskData.userLevel === 3 && taskData.accountInfo?.address) {
            DataManager.saveData("legalReps", [
                {
                    name: taskData.racUserName,
                    address: taskData.accountInfo.address,
                    role: null, // Default or populate as needed
                    phone: null
                }
            ]);
        }
        
        if (taskData.racUserName) {
            DataManager.saveData("racUserName", taskData.racUserName);
            document.getElementById("task-rep-name").textContent = taskData.racUserName;   
        }
        else {
            document.getElementById("task-rep-name").textContent = "REPRESENTATIVE NAME";
        }

        if (taskData.accountInfo && taskData.accountInfo.name) {
            document.getElementById("task-accountuser-name").textContent = taskData.accountInfo.name;
        }
    }

    // Initialize Stepper
    const stepper = new Stepper('.step');

    // Initialize ProgressiveDisclosure and pass the stepper instance
    new ProgressiveDisclosure(stepper);

    // Load the last step from session storage
    const savedStepId = sessionStorage.getItem('currentStep');
    if (savedStepId) {
        stepper.jumpStep(savedStepId);
    }

    // Add event listeners to all next buttons
    document.querySelector('.stepper').addEventListener('click', (event) => {
        if (event.target.classList.contains('next-button')) {
            stepper.navigateStep('next');
         
        } else if (event.target.classList.contains('back-button')) {
            stepper.navigateStep('back');
        
        }
    });

    // Populate radio button labels with their 'value'
    const inputsWithLabels = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    inputsWithLabels.forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) {
            label.textContent = input.value;
        }
    });

    //Add asterisks to all required fields
    const requiredInputs = document.querySelectorAll('.required-label');
    requiredInputs.forEach(input => {
    if (input) {
        const asterisk = document.createElement('span');
        asterisk.textContent = '* ';
        asterisk.classList.add('label-ast');

        input.insertBefore(asterisk, input.firstChild);
    }
    });

  
    //Accordion functionality
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        accordion.addEventListener('click', function() {
            this.classList.toggle('active');

        });
    });
    
});

///start here - not working
window.addEventListener('beforeunload', (event) => {
    if (!sessionStorage.getItem("navigatingToConfirmation")) {
        sessionStorage.clear();
    }
    sessionStorage.removeItem("navigatingToConfirmation"); // Reset flag after navigation
});
