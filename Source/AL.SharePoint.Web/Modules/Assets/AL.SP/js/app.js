//Page Load
var $j = jQuery.noConflict();

$j(document).ready(function () {
    //Search box drop down
    _spBodyOnLoadFunctionNames.push("overrideSearchBox");
});

//Variables
var rev = '?Rev=1.01';

var webParts = {
    partPath: function () { return _spPageContextInfo.siteServerRelativeUrl.replace(/\/$/, "") + '/_catalogs/masterpage/al.sp/parts/' },
    showMembers: 'Members.html',
    editMembers: 'EditMembers.html'
};

//Handlers
ko.bindingHandlers.renderUser = {
    propertyNames: ["PreferredName", "PictureURL", "AccountName", "Title", "WorkEmail", "SipAddress"],
    context: null,
    peopleManager: null,
    callbacks: null,
    timeout: null,
    init: function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var userName = value;
        if (value.userName)
            userName = value.userName;

        var ru = ko.bindingHandlers.renderUser;
        if (ru.context == null) {
            ru.context = clientContext = SP.ClientContext.get_current();
            ru.peopleManager = new SP.UserProfiles.PeopleManager(ru.context);
        }
        if (ru.callbacks == null)
            ru.callbacks = new Array();

        var userProfilePropertiesForUser = new SP.UserProfiles.UserProfilePropertiesForUser(ru.context, userName, ru.propertyNames);
        var userProfileProperties = ru.peopleManager.getUserProfilePropertiesFor(userProfilePropertiesForUser);
        clientContext.load(userProfilePropertiesForUser);
        ru.callbacks[ru.callbacks.length] = function () {
            userProfileProperties.LoginName = userName;
            userProfileProperties.Role = "";
            for (var i = 0; i < ru.propertyNames.length; i++) {
                userProfileProperties[ru.propertyNames[i]] = userProfileProperties[i];
            }
            if (!userProfileProperties.AccountName)
                userProfileProperties.AccountName = userName;
            element.innerHTML = ru.renderPresence(userProfileProperties, value.schemaOverride);
        };
        clearTimeout(ru.timeout);
        ru.timeout = setTimeout(function () {
            ru.context.executeQueryAsync(function () {
                for (var x = 0; x < ru.callbacks.length; x++) {
                    ru.callbacks[x]();
                }
                ru.context = null;
                ru.callbacks = null;
                ru.timeout = null;
                ProcessImn();
            }, function () {
                //handle errors
            });
        }, 1);
    },
    renderPresence: function (user, fieldSchemaOverride) {
        var renderCtx = new ContextInfo();
        renderCtx.Templates = {};
        renderCtx.Templates["Fields"] = {};

        var fieldSchemaData = fieldSchemaOverride;
        if (!fieldSchemaData)
            fieldSchemaData = { "WithPictureDetail": "1", "PictureSize": "Size_36px" };
        var listSchema = { "EffectivePresenceEnabled": "1", "PresenceAlt": "User Presence" };
        var userData = {
            "id": user.AccountName, "department": user.Role, "jobTitle": user.Title,
            "title": user.PreferredName, "email": user.WorkEmail, "picture": user.PictureURL, "sip": user.SipAddress
        };
        return RenderUserFieldWorker(renderCtx, fieldSchemaData, userData, listSchema);
    }
};

ko.bindingHandlers.clientPeoplePicker = {
    currentId: 0,
    init: function (element, valueAccessor) {
        var obs = valueAccessor();
        if (!ko.isObservable(obs)) {
            throw "clientPeoplePicker binding requires an observable";
        }

        var currentId = ko.bindingHandlers.clientPeoplePicker.currentId++;
        var currentElemId = "ClientPeoplePicker" + currentId;
        element.setAttribute("id", currentElemId);
        obs._peoplePickerId = currentElemId + "_TopSpan";
        ko.bindingHandlers.clientPeoplePicker.initPeoplePicker(currentElemId).done(function (picker) {
            picker.OnValueChangedClientScript = function (elementId, userInfo) {
                var temp = new Array();
                for (var x = 0; x < userInfo.length; x++) {
                    temp[temp.length] = userInfo[x].Key;
                }
                obs(temp);
            };
            ko.bindingHandlers.clientPeoplePicker.update(element, valueAccessor);
        });
    },
    update: function (element, valueAccessor) {
        var obs = valueAccessor();
        if (!ko.isObservable(obs)) {
            throw "clientPeoplePicker binding requires an observable array";
        }
        if (typeof SPClientPeoplePicker === 'undefined')
            return;

        var peoplePicker = SPClientPeoplePicker.SPClientPeoplePickerDict[obs._peoplePickerId];
        if (peoplePicker) {
            var keys = peoplePicker.GetAllUserKeys();
            keys = keys.length > 0 ? keys.split(";") : [];
            var updateKeys = obs() && obs().length ? obs() : [];
            var newKeys = new Array();
            for (var x = 0; x < updateKeys.length; x++) {
                for (var y = 0; y < keys.length && updateKeys[x] != keys[y]; y++) { }
                if (y >= keys.length) {
                    newKeys[newKeys.length] = updateKeys[x];
                }
            }

            if (newKeys.length > 0) {
                peoplePicker.AddUserKeys(newKeys.join(";"));
            }
        }
    },
    initPeoplePicker: function (elementId) {
        var schema = {};
        schema['PrincipalAccountType'] = 'User';
        schema['SearchPrincipalSource'] = 15;
        schema['ResolvePrincipalSource'] = 15;
        schema['AllowMultipleValues'] = true;
        schema['MaximumEntitySuggestions'] = 50;
        //schema['Width'] = '280px'; //use default width

        var dfd = $j.Deferred();

        SPSODAction(["sp.js", "clienttemplates.js", "clientforms.js", "clientpeoplepicker.js", "autofill.js"], function () {
            SPClientPeoplePicker_InitStandaloneControlWrapper(elementId, null, schema);
            dfd.resolve(SPClientPeoplePicker.SPClientPeoplePickerDict[elementId + "_TopSpan"]);
        });

        return dfd.promise();
    }
};

ko.bindingHandlers.webPartId = {
    init: function (element, valueAccessor) {
        var obs = valueAccessor();
        if (!ko.isObservable(obs)) {
            throw "webPartId binding requires an observable";
        }

        $j(element).parents("[webpartid]").each(function () {
            obs($j(this).attr("webpartid"));
        });
    }
};

ko.bindingHandlers.submitOnEnter = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        var allBindings = allBindingsAccessor();
        $j(element).keypress(function (event) {
            var keyCode = (event.which ? event.which : event.keyCode);
            if (keyCode === 13) {
                allBindings.submitOnEnter.call(viewModel);
                return false;
            }
            return true;
        });
    },
    update: function () { }
};

ko.bindingHandlers.starRating = {
    init: function (element, valueAccessor) {
        $j(element).addClass("doc-rating");
        for (var i = 0; i < 5; i++)
            $j("<span>").appendTo(element);

        $j("span", element).each(function (index) {
            $j(this).hover(
                function () {
                    $j(this).prevAll().add(this).addClass("hoverChosen");
                    $j(this).nextAll().addClass("hoverCleared");
                },
                function () {
                    $j(this).prevAll().add(this).removeClass("hoverChosen");
                    $j(this).nextAll().removeClass("hoverCleared");
                }
            ).click(function () {
                var observable = valueAccessor();
                observable(index + 1);
            });
        });
    },
    update: function (element, valueAccessor) {
        var observable = valueAccessor();
        var decRating = observable() - Math.floor(observable());
        var stars = observable() - decRating;
        $j("span", element).each(function (index) {
            if (index < stars) {
                $j(this).toggleClass("chosen", true);
            } else if (decRating > 0) {
                $j(this).toggleClass("halfChosen", decRating >= 0.25 && decRating <= 0.75);
                $j(this).toggleClass("chosen", decRating > 0.75);
                decRating = 0;
            } else
                $j(this).toggleClass("chosen", false);
        });
    }
};

//ViewModels
function PeoplePickerMembersViewModel(initUsers) {
    var self = this;
    self.webPartId = ko.observable();
    self.error = ko.observable("");
    self.success = ko.observable("");
    self.userNames = ko.observableArray();

    self.saveUsers = function () {
        saveToScriptEditor(self.webPartId(), self.userNames()).done(function () {
            self.success("Save successful");
        }).fail(self.error);
    };

    if (initUsers)
        self.userNames(initUsers);
}

function SearchRatingViewModel(avgRating, siteUrl, listId, listItemId) {
    var self = this;
    self.rating = ko.observable(avgRating);
    self.site = siteUrl;
    self.listId = listId;
    self.itemId = listItemId;
    self.rating.subscribe(function () {
        self.updateRating();
    });

    self.updateRating = function () {
        SPSODAction(['reputation.js'], function () {
            var spCtx = new SP.ClientContext(self.site);
            Microsoft.Office.Server.ReputationModel.Reputation.setRating(spCtx, self.listId, self.itemId, self.rating());
            spCtx.executeQueryAsync(function () {
                SP.UI.Notify.addNotification("Thank you for rating this document", false);
            }, function () {
                SP.UI.Notify.addNotification("There was an error saving your rating", false);
            });
        });
    };
}

//Functions
function getWebPartProperties(wpId) {
    var dfd = $j.Deferred();

    var clientContext = new SP.ClientContext(_spPageContextInfo.webServerRelativeUrl);
    var oFile = clientContext.get_web().getFileByServerRelativeUrl(_spPageContextInfo.serverRequestPath);
    var limitedWebPartManager = oFile.getLimitedWebPartManager(SP.WebParts.PersonalizationScope.shared);
    var collWebPart = limitedWebPartManager.get_webParts();

    clientContext.load(collWebPart);
    clientContext.executeQueryAsync(Function.createDelegate(this, function () {
        var webPartDef = null;
        for (var x = 0; x < collWebPart.get_count() && !webPartDef; x++) {
            var temp = collWebPart.get_item(x);
            if (temp.get_id().toString() === wpId) {
                webPartDef = temp;
            }
        }
        if (!webPartDef) {
            dfd.reject("Web Part: " + wpId + " not found on page: " + _spPageContextInfo.webServerRelativeUrl);
            return;
        }

        var webPartProperties = webPartDef.get_webPart().get_properties();
        clientContext.load(webPartProperties);
        clientContext.executeQueryAsync(Function.createDelegate(this, function () {
            dfd.resolve(webPartProperties, webPartDef, clientContext);
        }), Function.createDelegate(this, function () { dfd.reject("Failed to load web part properties"); }));
    }), Function.createDelegate(this, function () { dfd.reject("Failed to load web part collection"); }));

    return dfd.promise();
}

function saveWebPartProperties(wpId, obj) {
    var dfd = $j.Deferred();

    getWebPartProperties(wpId).done(function (webPartProperties, webPartDef, clientContext) {
        for (var key in obj) {
            webPartProperties.set_item(key, obj[key]);
        }
        webPartDef.saveWebPartChanges();
        clientContext.executeQueryAsync(Function.createDelegate(this, function () {
            dfd.resolve();
        }), Function.createDelegate(this, function () { dfd.reject("Failed to save web part properties"); }));
    }).fail(function (err) { dfd.reject(err); });

    return dfd.promise();
}

function saveToScriptEditor(wpId, obj) {
    var dfd = $j.Deferred();

    getWebPartProperties(wpId).done(function (wpProps) {
        var content = wpProps.get_item("Content");
        var match = /var options\s*=\s*([^;]*?);/.exec(content);
        if (!match) {
            dfd.reject("unable to update options variable in web part: " + wpId);
            return;
        }
            
        content = content.replace(match[0], match[0].replace(match[1], JSON.stringify(obj)));
        saveWebPartProperties(wpId, { Content: content }).done(function () {
            dfd.resolve()
        }).fail(dfd.reject);
    }).fail(dfd.reject);

    return dfd.promise();
}

function loadSPData(url, completeFunction) {
    $j.ajax({
        url: url, method: "GET",
        headers: { "accept": "application/json;odata=verbose" }
    }).success(function (data) {
        completeFunction(data);
    });
}

function loadWebPart(partId, contentFile, complete) {
    $j('#' + partId).load(contentFile + rev, function () {
        complete();
    });
}

function createKnockoutWebPart(elementId, wpName, viewModel) {
    SPSODAction(["sp.js"], function () {
        var prefix = "show";
        if (pageInEditMode()) {
            prefix = "edit";
        }
        var templatePath = webParts.partPath() + webParts[prefix + wpName];
        $j('#' + elementId).load(templatePath + rev, function () {
            ko.applyBindings(viewModel, document.getElementById(elementId));
        });
    });
}

function loadWebPartData(partId, contentFile, getUrl, complete) {
    $j(document).ready(function () {
        $j('#' + partId).load(contentFile + rev, function () {
            $j.get(getUrl).done(function (data) {
                complete(data);
            });
        });
    });
}

function loadTaxonomy(termSetId, collection) {
    var context = SP.ClientContext.get_current();
    var taxonomySession = SP.Taxonomy.TaxonomySession.getTaxonomySession(context);
    var termStore = taxonomySession.getDefaultSiteCollectionTermStore();
    var termSet = termStore.getTermSet(termSetId);
    var terms = termSet.get_terms();
    recurseTerms(context, terms, collection);
}

function recurseTerms(context, rootTerms, parentCollection) {
    context.load(rootTerms);
    context.executeQueryAsync(
        function () {
            var termsEnum = rootTerms.getEnumerator();
            while (termsEnum.moveNext()) {
                var currentTerm = termsEnum.get_current();
                var term = { title: currentTerm.get_name(), id: currentTerm.get_id(), subTerms : [] };
                parentCollection.push(term);

                if (currentTerm.get_termsCount() > 0) {
                    recurseTerms(context, currentTerm.get_terms(), term.subTerms);
                }
            }
        },
        function () { });
}

function formatSearchResults(data) {
    var returnData = [];
    var query = data.d.query;
    var results = query.PrimaryQueryResult.RelevantResults.Table.Rows.results;
    for (var x = 0; x < results.length; x++) {
        var cells = results[x].Cells.results;
        var resultObj = {};
        for (var y = 0; y < cells.length; y++) {
            resultObj[cells[y].Key] = cells[y].Value;
        }
        returnData.push(resultObj);
    }
    return returnData;
}

function SPSODAction(sodScripts, onLoadAction) {
    if (SP.SOD.loadMultiple) {
        for (var x = 0; x < sodScripts.length; x++) {
            if (!_v_dictSod[sodScripts[x]]) {
                SP.SOD.registerSod(sodScripts[x], '/_layouts/15/' + sodScripts[x]);
            }
        }
        SP.SOD.loadMultiple(sodScripts, onLoadAction);
    } else
        ExecuteOrDelayUntilScriptLoaded(onLoadAction, sodScripts[0]);
}

function parseDate(jsonDate) {
    var d = new Date(parseInt(jsonDate.substr(6)));
    return d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear();
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;

    var match = RegExp('[?&]' + name + '=([^&#]*)').exec(url);
    return match && match[1].replace(/\+/g, ' ');
}

function pageInEditMode() {
    var inEditMode = null;
    if (document.forms[MSOWebPartPageFormName].MSOLayout_InDesignMode) {
        inEditMode = document.forms[MSOWebPartPageFormName].MSOLayout_InDesignMode.value;
    }
    var wikiInEditMode = null;
    if (document.forms[MSOWebPartPageFormName]._wikiPageMode) {
        wikiInEditMode = document.forms[MSOWebPartPageFormName]._wikiPageMode.value;
    }
    if (!inEditMode && !wikiInEditMode)
        return false;

    return inEditMode == "1" || wikiInEditMode == "Edit";
}

function overrideSearchBox() {
    $j("input.ms-srch-sb-prompt").click(function (event) {
        var nodes = $j("div.ms-qSuggest-listItem");
        if (nodes.length > 0) {
            $j("#NavDropdownListContainer").css({ display: "block", visibility: "visible" });
        }
        else {
            $j(this).next().click();
        }
        return Srch.U.cancelEvent(event.OriginalEvent);
    });
    $j('input.ms-srch-sb-prompt').blur(function () {
        $j("#NavDropdownListContainer").css({ display: "none", visibility: "visible" });
    });
}

function loadMembersWebPart(initUsers) {
    var partId = "ElementKOPeoplePicker" + loadMembersWebPart.curId++;
    document.write("<div id='" + partId + "'></div>");
    createKnockoutWebPart(partId, "Members", new PeoplePickerMembersViewModel(initUsers));
}
loadMembersWebPart.curId = 0;