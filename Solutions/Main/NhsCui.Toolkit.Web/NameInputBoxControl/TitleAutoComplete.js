//-----------------------------------------------------------------------
// <copyright file="TitleAutoComplete.js" company="Microsoft Corporation and Crown copyright 2007 - 2010.">
// Copyright (c) Microsoft Corporation and Crown copyright 2007 - 2010.
// All rights reserved.
//
// CERTAIN PARTS OF THIS WORK CONTAIN SOFTWARE CODE THAT IS LICENSED
// FOR USE UNDER THE MICROSOFT PUBLIC LICENSE. DISTRIBUTION, IN SOURCE CODE
// OR OBJECT CODE FORM, OF THOSE PARTS MUST COMPLY WITH THE TERMS OF THE
// PUBLIC LICENSE. SEE http://www.microsoft.com/opensource/licenses.mspx
// FOR DETAILS.
// IF YOU BRING A PATENT CLAIM AGAINST ANY CONTRIBUTOR OVER PATENTS THAT
// YOU CLAIM ARE INFRINGED BY THE PUBLIC LICENSE SOFTWARE, YOUR PATENT
// LICENSE FROM SUCH CONTRIBUTOR TO THE SOFTWARE ENDS AUTOMATICALLY.
//
// THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY 
// KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
// </copyright>
// <date>17-Sep-2007</date>
// <summary>
//    Autocomplete dropdown implementation for Title textbox in the
//    NameInputBox Control. Adapted from the AjaxToolkit version,
//    but doesn't use a WS as the source of the dropdown list
// </summary>
//-----------------------------------------------------------------------

Type.registerNamespace("NhsCui.Toolkit.Web.NameInputBoxControl");

NhsCui.Toolkit.Web.NameInputBoxControl.TitleAutoComplete = function(element) 
{
    /// <summary>
    /// This behavior can be attached to a textbox to enable auto-complete/auto-suggest scenarios.
    /// </summary>
    /// <param name="element" type="Sys.UI.DomElement" DomElement="true" mayBeNull="false">
    /// DOM Element the behavior is associated with
    /// </param>
    /// <returns />
    NhsCui.Toolkit.Web.NameInputBoxControl.TitleAutoComplete.initializeBase(this, [element]);
    
    this._minimumPrefixLength = 1;
    this._completionSetCount = 10;
    this._completionInterval = 10;        
    this._completionListElementID = null;
    this._completionListElement = null;
    this._textColor = 'windowtext';
    this._textBackground = 'window';
    this._popupBehavior = null;
    this._popupBehaviorHiddenHandler = null;
    this._onShowJson = null;
    this._onHideJson = null;
    this._timer = null;
    this._currentPrefix = null;
    this._selectIndex = -1;
    this._focusHandler = null;
    this._blurHandler = null;
    this._bodyClickHandler = null;
    this._completionListBlurHandler = null;        
    this._keyDownHandler = null;
    this._mouseDownHandler = null;
    this._mouseUpHandler = null;
    this._mouseOverHandler = null;
    this._tickHandler = null;
    this._flyoutHasFocus = false;
    this._textBoxHasFocus = false;
    this._completionListCssClass = null;        
    this._completionListItemCssClass = null;
    this._highlightedItemCssClass = null;
    this._delimiterCharacters = null;
    this._firstRowSelected = false;
    this._titles = ["Admiral", "Captain", "Colonel", "Commander", "Doctor", "Dr", "Lieutenant", "Major", "Miss", "Mr", "Mrs", "Ms", "Prof", "Professor"];
}

NhsCui.Toolkit.Web.NameInputBoxControl.TitleAutoComplete.prototype = 
{
    initialize: function() 
    {
        /// <summary>
        /// Initializes the autocomplete behavior.
        /// </summary>
        /// <returns />
        NhsCui.Toolkit.Web.NameInputBoxControl.TitleAutoComplete.callBaseMethod(this, 'initialize');
        
        this._popupBehaviorHiddenHandler = Function.createDelegate(this, this._popupHidden);
        this._tickHandler = Function.createDelegate(this, this._onTimerTick);
        this._focusHandler = Function.createDelegate(this, this._onGotFocus);
        this._blurHandler = Function.createDelegate(this, this._onLostFocus);
        this._keyDownHandler = Function.createDelegate(this, this._onKeyDown);
        this._mouseDownHandler = Function.createDelegate(this, this._onListMouseDown);
        this._mouseUpHandler = Function.createDelegate(this, this._onListMouseUp);
        this._mouseOverHandler = Function.createDelegate(this, this._onListMouseOver);
        this._completionListBlurHandler = Function.createDelegate(this, this._onCompletionListBlur);
        this._bodyClickHandler = Function.createDelegate(this, this._onCompletionListBlur);
        
        this._timer = new Sys.Timer();
        this.initializeTimer(this._timer);
        
        var element = this.get_element();
        this.initializeTextBox(element);
        
        if(this._completionListElementID !== null)
        {
            this._completionListElement = $get(this._completionListElementID);
        }
        
        if (this._completionListElement == null ) 
        {
            this._completionListElement = document.createElement('ul');
            this._completionListElement.id = this.get_id() + '_completionListElem';

            // Safari styles the element incorrectly if it's added to the desired location
            if (Sys.Browser.agent === Sys.Browser.Safari) 
            {
                document.body.appendChild(this._completionListElement);
            }
            else 
            {
                element.parentNode.insertBefore(this._completionListElement, element.nextSibling);
            }
        }
        this.initializeCompletionList(this._completionListElement);
        
        this._popupBehavior = $create(AjaxControlToolkit.PopupBehavior, 
                { 'id':this.get_id()+'PopupBehavior', 'parentElement':element, "positioningMode": AjaxControlToolkit.PositioningMode.BottomLeft }, null, null, this._completionListElement);
        this._popupBehavior.add_hidden(this._popupBehaviorHiddenHandler);
        
        // Create the animations (if they were set before initialize was called)
        if (this._onShowJson) 
        {
            this._popupBehavior.set_onShow(this._onShowJson);
        }
        if (this._onHideJson) 
        {
            this._popupBehavior.set_onHide(this._onHideJson);
        }
    },
    
    dispose: function() 
    {
        /// <summary>
        /// Disposes the autocomplete behavior
        /// </summary>
        /// <returns />
       
        this._onShowJson = null;
        this._onHideJson = null;
        if (this._popupBehavior) 
        {
            if (this._popupBehaviorHiddenHandler) 
            {
                this._popupBehavior.remove_hidden(this._popupBehaviorHiddenHandler);
            }
            this._popupBehavior.dispose();
            this._popupBehavior = null;
        }
        if (this._timer) 
        {        
            this._timer.dispose();
            this._timer = null;
        }

        var element = this.get_element();
        if (element) 
        {
            $removeHandler(element, "focus", this._focusHandler);
            $removeHandler(element, "blur", this._blurHandler);
            $removeHandler(element, "keydown", this._keyDownHandler);
            $removeHandler(this._completionListElement, 'blur', this._completionListBlurHandler);
            $removeHandler(this._completionListElement, 'mousedown', this._mouseDownHandler);
            $removeHandler(this._completionListElement, 'mouseup', this._mouseUpHandler);
            $removeHandler(this._completionListElement, 'mouseover', this._mouseOverHandler);
        }
        if (this._bodyClickHandler) 
        {
            $removeHandler(document.body, 'click', this._bodyClickHandler);
            this._bodyClickHandler = null;
        }
        
        this._popupBehaviorHiddenHandler = null;
        this._tickHandler = null;
        this._focusHandler = null;
        this._blurHandler = null;
        this._keyDownHandler = null;
        this._completionListBlurHandler = null;
        this._mouseDownHandler = null;
        this._mouseUpHandler = null;
        this._mouseOverHandler = null;
        
        NhsCui.Toolkit.Web.NameInputBoxControl.TitleAutoComplete.callBaseMethod(this, 'dispose');
    },
    
    initializeTimer: function(timer) 
    {
        /// <summary>
        /// Initializes the timer
        /// </summary>
        /// <param name="timer" type="Sys.UI.Timer" DomElement="false" mayBeNull="false" />
        /// <returns />
        timer.set_interval(this._completionInterval);
        timer.add_tick(this._tickHandler);
    },
    
    initializeTextBox: function(element) 
    {
        /// <summary>
        /// Initializes the textbox
        /// </summary>
        /// <param name="element" type="Sys.UI.DomElement" DomElement="true" mayBeNull="false" />
        /// <returns />    
        element.autocomplete = "off";
        $addHandler(element, "focus", this._focusHandler);        
        $addHandler(element, "blur", this._blurHandler);
        $addHandler(element, "keydown", this._keyDownHandler);
    },
    
    initializeCompletionList: function(element) 
    {
        /// <summary>
        /// Initializes the autocomplete list element
        /// </summary>
        /// <param name="element" type="Sys.UI.DomElement" DomElement="true" mayBeNull="false" />
        /// <returns />        
        
        if(this._completionListCssClass) 
        {
            Sys.UI.DomElement.addCssClass(element, this._completionListCssClass);
        }
        else
        {
            var completionListStyle = element.style;
            completionListStyle.textAlign = 'left';
            completionListStyle.visibility = 'hidden';
            completionListStyle.cursor = 'default';
            completionListStyle.listStyle = 'none';
            completionListStyle.padding = '0px';
            completionListStyle.margin = '0px! important';
            if (Sys.Browser.agent === Sys.Browser.Safari) 
            {
                completionListStyle.border = 'solid 1px gray';    
                completionListStyle.backgroundColor = 'white';
                completionListStyle.color = 'black';                        
            }
            else 
            {
                completionListStyle.border = 'solid 1px buttonshadow';            
                completionListStyle.backgroundColor = this._textBackground;
                completionListStyle.color = this._textColor;                
            }
        }
        $addHandler(element, "mousedown", this._mouseDownHandler);
        $addHandler(element, "mouseup", this._mouseUpHandler);
        $addHandler(element, "mouseover", this._mouseOverHandler);
        $addHandler(element, "blur", this._completionListBlurHandler);   
        $addHandler(document.body, 'click', this._bodyClickHandler);
    },
    
    _currentCompletionWord: function() 
    {
        var element = this.get_element();
        var elementValue = element.value;
        var word = elementValue;
        
        if (this.get_isMultiWord()) 
        {
            var startIndex = this._getCurrentWordStartIndex();
            var endIndex = this._getCurrentWordEndIndex(startIndex);
            
            if (endIndex <= startIndex) 
            {
                word = elementValue.substring(startIndex);
            }
            else
            {
                word = elementValue.substring(startIndex, endIndex);
            }
        }
        
        return word;
    },
    
    _getCursorIndex: function() 
    {
        return this.get_element().selectionStart;
    },
    
    _getCurrentWordStartIndex: function() 
    {
        var element = this.get_element();
        var elementText = element.value.substring(0,this._getCursorIndex());
        
        var index = 0;
        var lastIndex = -1;
        
        for (var i = 0; i < this._delimiterCharacters.length; ++i) 
        {
            var curIndex = elementText.lastIndexOf(this._delimiterCharacters.charAt(i));
            if (curIndex > lastIndex) 
            {
                lastIndex = curIndex;
            }
        }    
        
        index = lastIndex;
        if (index >= this._getCursorIndex()) 
        {
            index = 0;
        }
        
        return index < 0 ? 0 : index + 1;    
    },
    
    _getCurrentWordEndIndex: function(wordStartIndex) 
    {
        var element = this.get_element();
        var elementText = element.value.substring(wordStartIndex);
        var index = 0;
        
        for (var i = 0; i < this._delimiterCharacters.length; ++i) 
        {
            var curIndex = elementText.indexOf(this._delimiterCharacters.charAt(i));
            if (curIndex > 0 && (curIndex < index || index == 0)) 
            {
                index = curIndex;
            }
        }
               
        return index <= 0 ? element.value.length : index + wordStartIndex;
    },
    
    get_isMultiWord : function() 
    {
        /// <value type="Boolean" mayBeNull="false">
        /// Whether the behavior is currently in multi-word mode
        /// </value>
        return (this._delimiterCharacters != null) && (this._delimiterCharacters != '');
    },
    
    _getTextWithInsertedWord: function(wordToInsert) 
    {
        var text = wordToInsert;
        var replaceIndex = 0;
        var element = this.get_element();
        var originalText = element.value;
        
        if (this.get_isMultiWord()) 
        {
            var startIndex = this._getCurrentWordStartIndex();
            var endIndex = this._getCurrentWordEndIndex(startIndex);
            var prefix = '';
            var suffix = '';
            
            if (startIndex > 0) 
            {
                prefix = originalText.substring(0, startIndex);
            }
            if (endIndex > startIndex) 
            {
                suffix = originalText.substring(endIndex);
            }
            
            text = prefix + wordToInsert + suffix;
        }
        
        return text;
    },
    
    _hideCompletionList: function() 
    {
        /// <summary>
        /// Hides the autocomplete flyout list
        /// </summary>
        /// <returns />
        
        var eventArgs = new Sys.CancelEventArgs();
        this.raiseHiding(eventArgs);
        if (eventArgs.get_cancel()) 
        {
            return;
        }
        
        // Actually hide the popup
        this.hidePopup();
    },
    
    showPopup : function() 
    {
        /// <summary>
        /// Show the completion list popup
        /// </summary>
        /// <remarks>
        /// If you cancel the showing event, you should still call
        /// showPopup to ensure consistency of the internal state
        /// </remarks>
        this._popupBehavior.show();
        this.raiseShown(Sys.EventArgs.Empty);
    },
    
    hidePopup : function() 
    {
        /// <summary>
        /// Hide the completion list popup
        /// </summary>
        /// <remarks>
        /// If you cancel the hiding event, you should still
        /// call hidePopup to ensure consistency of the internal
        /// state
        /// </remarks>

        if (this._popupBehavior) 
        {
            this._popupBehavior.hide();
        }
        else
        {
            this._popupHidden();
        }
    },
    
    _popupHidden : function() 
    {
        /// <summary>
        /// Clean up the completion list popup after it has been hidden
        /// </summary>
    
        this._completionListElement.innerHTML = '';
        this._selectIndex = -1;
        this._flyoutHasFocus = false;
        
        this.raiseHidden(Sys.EventArgs.Empty);
    },
    
    _highlightItem: function(item) 
    {
        /// <summary>
        /// Highlights the specified item
        /// </summary>
        /// <param name="item" type="Sys.UI.DomElement" DomElement="true" mayBeNull="false" />
        /// <returns />
        
        var children = this._completionListElement.childNodes;

        // Unselect any previously highlighted item        
        for (var i = 0; i < children.length; i++) 
        {
            var child = children[i];
            if (child._highlighted) 
            {
                if (this._completionListItemCssClass) 
                {
                    Sys.UI.DomElement.removeCssClass(child, this._highlightedItemCssClass);
                    Sys.UI.DomElement.addCssClass(child, this._completionListItemCssClass);
                }
                else
                {
                    if (Sys.Browser.agent === Sys.Browser.Safari) 
                    {
                        child.style.backgroundColor = 'white';
                        child.style.color = 'black';                    
                    }
                    else
                    {
                        child.style.backgroundColor = this._textBackground;
                        child.style.color = this._textColor;
                    }
                }
                this.raiseItemOut(new NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs(child, child.firstChild.nodeValue));
            }
        }
        
        // Highlight the new item
        if(this._highlightedItemCssClass) 
        {
            Sys.UI.DomElement.removeCssClass(item, this._completionListItemCssClass);
            Sys.UI.DomElement.addCssClass(item, this._highlightedItemCssClass);
        }
        else
        {
            if (Sys.Browser.agent === Sys.Browser.Safari) 
            {        
                item.style.backgroundColor = 'lemonchiffon';
            }
            else 
            {
                item.style.backgroundColor = 'highlight';
                item.style.color = 'highlighttext';
            }
            
        }
        item._highlighted = true;
        this.raiseItemOver(new NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs(item, item.firstChild.nodeValue));
    },

    /// <summary>
    /// Handler for the blur event on the autocomplete flyout.
    /// </summary>
    /// <param name="ev" type="Sys.UI.DomEvent" DomElement="false" mayBeNull="false" />
    /// <returns />    
    _onCompletionListBlur: function(ev) 
    {
        this._hideCompletionList();
    },
    
    _onListMouseDown: function(ev) 
    {
        /// <summary>
        /// Handler for the mousedown event on the autocomplete flyout.
        /// </summary>
        /// <param name="ev" type="Sys.UI.DomEvent" DomElement="false" mayBeNull="false" />
        /// <returns />     
        if (ev.target !== this._completionListElement) 
        {
            this._setText(ev.target);
            this._flyoutHasFocus = false;
        }
        else
        { // focus is still on the flyout and we do not want to hide it
            this._flyoutHasFocus = true;
        }
    },
    
    _onListMouseUp: function(ev) 
    {
        /// <summary>
        /// Handler for the mouseup event on the autocomplete flyout.
        /// </summary>
        /// <param name="ev" type="Sys.UI.DomEvent" DomElement="false" mayBeNull="false" />
        /// <returns />      
        this.get_element().focus();
    },
    
    _onListMouseOver: function(ev) 
    {
        /// <summary>
        /// Handler for the mouseover event on the autocomplete flyout.
        /// </summary>
        /// <param name="ev" type="Sys.UI.DomEvent" DomElement="false" mayBeNull="false" />
        /// <returns />      
        var item = ev.target;
        if(item !== this._completionListElement) 
        {
            var children = this._completionListElement.childNodes;
            // make sure the selected index is updated
            for (var i = 0; i < children.length; ++i) 
            {
                if (item === children[i]) 
                {
                    this._highlightItem(item);
                    this._selectIndex = i;
                    break;
                }  
            }
        }
    },

    _onGotFocus: function(ev) 
    {
        /// <summary>
        /// Handler for textbox focus event.
        /// </summary>
        /// <param name="ev" type="Sys.UI.DomEvent" DomElement="false" mayBeNull="false" />
        /// <returns />      
        this._textBoxHasFocus = true;
        if (this._flyoutHasFocus) 
        {
            // hide the flyout now that the focus is back on the textbox
            this._hideCompletionList();          
        }
        this._timer.set_enabled(true);
    },
    
    _onKeyDown: function(ev) 
    {
        /// <summary>
        /// Handler for the textbox keydown event.
        /// </summary>
        /// <param name="ev" type="Sys.UI.DomEvent" DomElement="false" mayBeNull="false" />
        /// <returns />      
        var k = ev.keyCode ? ev.keyCode : ev.rawEvent.keyCode;
        if (k === Sys.UI.Key.esc) 
        {
            this._hideCompletionList();
            ev.preventDefault();
        }
        else if (k === Sys.UI.Key.up) 
        {
            if (this._selectIndex > 0) 
            {
                this._selectIndex--;
                this._handleScroll(this._completionListElement.childNodes[this._selectIndex], this._selectIndex);
                this._highlightItem(this._completionListElement.childNodes[this._selectIndex]);
                ev.stopPropagation();     
                ev.preventDefault();
            }
        }
        else if (k === Sys.UI.Key.down) 
        {
            if (this._selectIndex < (this._completionListElement.childNodes.length - 1)) 
            {
                this._selectIndex++;                        
                this._handleScroll(this._completionListElement.childNodes[this._selectIndex], this._selectIndex);
                this._highlightItem(this._completionListElement.childNodes[this._selectIndex]);              
                ev.stopPropagation();                
                ev.preventDefault();
            }
        }
        else if (k === Sys.UI.Key.enter) 
        {
            if (this._selectIndex !== -1) 
            {
                this._setText(this._completionListElement.childNodes[this._selectIndex]);
                ev.preventDefault();
            }
            else
            {
                // close the popup
                this.hidePopup();
            }
        }
        else if (k === Sys.UI.Key.tab) 
        {
            if (this._selectIndex !== -1) 
            {
                this._setText(this._completionListElement.childNodes[this._selectIndex]);
            }
        }
        else 
        {
            this._timer.set_enabled(true);
        }
    },
    
    _handleScroll : function(element, index) 
    {
        /// <summary>
        /// Method to determine if an item is in view or not
        /// </summary>
        /// <returns />
        /// <param name="element" type="Sys.UI.DomElement" DomElement="true" mayBeNull="false" />
        /// <param name="index" type="Number" DomElement="false" mayBeNull="true" />        
        var flyout = this._completionListElement;
        var elemBounds = $common.getBounds(element);
        var numItems = this._completionListElement.childNodes.length;
        if (((elemBounds.height * index) - (flyout.clientHeight + flyout.scrollTop)) >= 0) 
        {
            // you need to scroll down
            flyout.scrollTop += (((elemBounds.height * index) - (flyout.clientHeight + flyout.scrollTop)) + elemBounds.height);
        }
        if (((elemBounds.height * (numItems - (index + 1))) - (flyout.scrollHeight - flyout.scrollTop)) >= 0) 
        {
            // you need to scroll up
            flyout.scrollTop -= (((elemBounds.height * (numItems - (index + 1))) - (flyout.scrollHeight - flyout.scrollTop)) + elemBounds.height); 
        }  
        
        if (flyout.scrollTop % elemBounds.height !== 0) 
        { 
            if (((elemBounds.height * (index + 1)) - (flyout.clientHeight + flyout.scrollTop)) >= 0) 
            { 
                // an element is partially displayed at the bottom
                flyout.scrollTop -= (flyout.scrollTop % elemBounds.height);       
            }
            else
            { // an element is partially displayed on the top 
                flyout.scrollTop += (elemBounds.height - (flyout.scrollTop % elemBounds.height));
            }
        }  
     
    },
    
    _handleFlyoutFocus : function() 
    {
        /// <summary>
        /// Method to handle flyout focus if textbox loses focus.
        /// </summary>
        /// <returns />   
        if(!this._textBoxHasFocus) 
        { 
            if (!this._flyoutHasFocus) 
            { 
                // the textbox lost focus and the flyout does not have it
                this._hideCompletionList();
            }
            else
            {
                // keep the flyout around otherwise
            }
        }
    },     
    
    _onLostFocus: function() 
    {
        /// <summary>
        /// Handler textbox blur event.
        /// </summary>
        /// <returns />      
        this._textBoxHasFocus = false;   
        this._timer.set_enabled(false);   
        /* the rest of the onblur handling will be done in
        this method after a minor delay to ensure we do not close the flyout 
        if a user clicks on its scroll bars for example */  
        window.setTimeout(Function.createDelegate(this, this._handleFlyoutFocus), 500);
    },  
    
    _onTimerTick: function(sender, eventArgs) 
    {
        /// <summary>
        /// Handler invoked when a timer tick occurs
        /// </summary>
        /// <param name="sender" type="Object" mayBeNull="true"/>
        /// <param name="eventArgs" type="Sys.EventArgs" mayBeNull="true" />        
        /// <returns />  
        
        var text = this._currentCompletionWord();
        
        if (text.trim().length < this._minimumPrefixLength) 
        {
            this._currentPrefix = null;
            this._update(null);
            return;
        }
        // there is new content in the textbox or the textbox is empty but the min prefix length is 0
       if ((this._currentPrefix !== text) || ((text == "") && (this._minimumPrefixLength == 0))) 
       {
            this._currentPrefix = text;
            // Raise the populating event and optionally cancel the web service invocation
            var eventArgs = new Sys.CancelEventArgs();
            this.raisePopulating(eventArgs);
            if (eventArgs.get_cancel()) 
            {
                return;
            }
            
            // Just need call to update with matching sub-list of titles here?
            this._update(this._findTitleMatches(this._currentPrefix));
        }
    },
    
    _setText: function(item) 
    {
        /// <summary>
        /// Method to set the selected autocomplete option on the textbox
        /// </summary>
        /// <param name="item" type="Sys.UI.DomElement" DomElement="true" mayBeNull="true">
        /// Item to select
        /// </param>
        /// <returns />
        
        var text = (item && item.firstChild) ? item.firstChild.nodeValue : null;
        this.raiseItemSelected(new NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs(item, text));
        
        this._timer.set_enabled(false);

        var element = this.get_element();
        var control = element.control;
        if (control && control.set_text) 
        {
            control.set_text(text);
            $common.tryFireEvent(control, "change");
        }
        else
        {
            element.value = text;
            $common.tryFireEvent(element, "change");
        }
        this._currentPrefix = this._currentCompletionWord();
        this._hideCompletionList();
    },
    
    _update: function(completionItems) 
    {
        /// <summary>
        /// Method to update the status of the autocomplete behavior
        /// </summary>
        /// <param name="prefixText" type="String" DomElement="false" mayBeNull="true" />
        /// <param name="completionItems" type="Object" DomElement="false" mayBeNull="true" />
        /// <returns />       

        if (completionItems && completionItems.length) 
        {
            this._completionListElement.innerHTML = '';
            this._selectIndex = -1;
            var _firstChild = null;
        
            for (var i = 0; i < completionItems.length; i++) 
            {
                var itemElement = null;
                if (this._completionListElementID) 
                { 
                    // the completion element has been created by the user and li won't necessarily work
                    itemElement = document.createElement('div');
                }
                else
                {
                    itemElement = document.createElement('li');
                }
                
                // set the first child if it is null
                if( _firstChild == null )
                {
                    _firstChild = itemElement;
                }

                itemElement.appendChild(document.createTextNode(this._getTextWithInsertedWord(completionItems[i])));
                itemElement.__item = '';
                
                if (this._completionListItemCssClass) 
                {
                    Sys.UI.DomElement.addCssClass(itemElement, this._completionListItemCssClass);
                }
                else
                {
                    var itemElementStyle = itemElement.style;
                    itemElementStyle.padding = '0px';
                    itemElementStyle.textAlign = 'left';
                    itemElementStyle.textOverflow = 'ellipsis';
                    // workaround for safari since normal colors do not
                    // show well there.
                    if (Sys.Browser.agent === Sys.Browser.Safari) 
                    {
                        itemElementStyle.backgroundColor = 'white';
                        itemElementStyle.color = 'black';
                    }
                    else 
                    {
                        itemElementStyle.backgroundColor = this._textBackground;
                        itemElementStyle.color = this._textColor;
                    }
                }
                this._completionListElement.appendChild(itemElement);
            }
            var elementBounds = $common.getBounds(this.get_element());        
            this._completionListElement.style.width = Math.max(1, elementBounds.width - 2) + 'px';
            this._completionListElement.scrollTop = 0;
            
            this.raisePopulated(Sys.EventArgs.Empty);
            
            var eventArgs = new Sys.CancelEventArgs();
            this.raiseShowing(eventArgs);
            if (!eventArgs.get_cancel()) 
            {
                this.showPopup();
                // Check if the first Row is to be selected by default and if yes highlight it and updated selectIndex.
                if (this._firstRowSelected && (_firstChild != null)) 
                {
                    this._highlightItem( _firstChild );
                    this._selectIndex = 0;
                }
            }            
        }
        else
        {
            this._hideCompletionList();
        }
    },
    
    _findTitleMatches : function(currentPrefix)
    {
        var matchingTitles = [];
        for (var i = 0; i < this._titles.length; i++)
        {
            if (this._titles[i].toUpperCase().startsWith(currentPrefix.toUpperCase()) === true)
            {
                matchingTitles.push(this._titles[i]);
            }
        }
        
        return matchingTitles;
    },
    
    get_onShow : function() 
    {
        /// <value type="String" mayBeNull="true">
        /// Generic OnShow Animation's JSON definition
        /// </value>
        return this._popupBehavior ? this._popupBehavior.get_onShow() : this._onShowJson;
    },
    set_onShow : function(value) 
    {
        if (this._popupBehavior) 
        {
            this._popupBehavior.set_onShow(value)
        }
        else 
        {
            this._onShowJson = value;
        }
        this.raisePropertyChanged('onShow');
    },
    get_onShowBehavior : function() 
    {
        /// <value type="AjaxControlToolkit.Animation.GenericAnimationBehavior">
        /// Generic OnShow Animation's behavior
        /// </value>
        return this._popupBehavior ? this._popupBehavior.get_onShowBehavior() : null;
    },
    onShow : function() 
    {
        /// <summary>
        /// Play the OnShow animation
        /// </summary>
        /// <returns />
        if (this._popupBehavior) 
        {
            this._popupBehavior.onShow();
        }
    },
        
    get_onHide : function() 
    {
        /// <value type="String" mayBeNull="true">
        /// Generic OnHide Animation's JSON definition
        /// </value>
        return this._popupBehavior ? this._popupBehavior.get_onHide() : this._onHideJson;
    },
    set_onHide : function(value) 
    {
        if (this._popupBehavior) 
        {
            this._popupBehavior.set_onHide(value)
        }
        else
        {
            this._onHideJson = value;
        }
        this.raisePropertyChanged('onHide');
    },
    get_onHideBehavior : function() 
    {
        /// <value type="AjaxControlToolkit.Animation.GenericAnimationBehavior">
        /// Generic OnHide Animation's behavior
        /// </value>
        return this._popupBehavior ? this._popupBehavior.get_onHideBehavior() : null;
    },
    onHide : function() 
    {
        /// <summary>
        /// Play the OnHide animation
        /// </summary>
        /// <returns />
        if (this._popupBehavior) 
        {
            this._popupBehavior.onHide();
        }
    },
    
    get_completionInterval: function() 
    {
        /// <value type="Number" integer="true" maybeNull="true">
        /// Auto completion timer interval in milliseconds.
        /// </value>
        return this._completionInterval;
    },
    set_completionInterval: function(value) 
    {
        if (this._completionInterval != value) 
        {
            this._completionInterval = value;
            this.raisePropertyChanged('completionInterval');
        }
    },
    
    get_completionList: function() 
    {
        /// <value type="Sys.UI.DomElement" domElement="true" maybeNull="true">
        /// List dom element.
        /// </value>
        return this._completionListElement;
    },
    set_completionList: function(value) 
    {
        if (this._completionListElement != value) 
        {
            this._completionListElement = value;
            this.raisePropertyChanged('completionList');
        }
    },
    
    get_completionSetCount: function() 
    {
        /// <value type="Number" integer="true" maybeNull="true">
        /// Maximum completion set size.
        /// </value>
        return this._completionSetCount;
    },
    set_completionSetCount: function(value) 
    {
        if (this._completionSetCount != value) 
        {
            this._completionSetCount = value;
            this.raisePropertyChanged('completionSetCount');
        }
    },
    
    get_minimumPrefixLength: function() 
    {
        /// <value type="Number" integer="true" maybeNull="true">
        /// Minimum text prefix length required to call the webservice.
        /// </value>
        return this._minimumPrefixLength;
    },
    set_minimumPrefixLength: function(value) 
    {
        if (this._minimumPrefixLength != value) 
        {
            this._minimumPrefixLength = value;
            this.raisePropertyChanged('minimumPrefixLength');
        }
    },
    
    get_completionListElementID: function() 
    {
        /// <value type="String" maybeNull="true">
        /// ID of the completion div element.
        /// </value>
        return this._completionListElementID;
    },
    set_completionListElementID: function(value) 
    {
        if (this._completionListElementID != value) 
        {
            this._completionListElementID = value;
            this.raisePropertyChanged('completionListElementID');
        }
    },  
    
    get_completionListCssClass : function() 
    {
        /// <value type="String" maybeNull="true">
        /// Css class name that will be used to style the completion list element.
        /// </value>
        this._completionListCssClass;
    },
    set_completionListCssClass : function(value) 
    {
        if (this._completionListCssClass != value) 
        {
            this._completionListCssClass = value;    
            this.raisePropertyChanged('completionListCssClass');
        }
    },   
    
    get_completionListItemCssClass : function() 
    {
        /// <value type="String" maybeNull="true">
        /// Css class name that will be used to style an item in the completion list.
        /// </value>
        this._completionListItemCssClass;
    },
    set_completionListItemCssClass : function(value) 
    {
        if (this._completionListItemCssClass != value) 
        {
            this._completionListItemCssClass = value;    
            this.raisePropertyChanged('completionListItemCssClass');
        }
    },
    
    get_highlightedItemCssClass : function() 
    {
        /// <value type="String" maybeNull="true">
        /// Css class name that will be used to style a highlighted item in the list.
        /// </value>
        this._highlightedItemCssClass;
    },
    set_highlightedItemCssClass : function(value) 
    {
        if(this._highlightedItemCssClass != value) 
        {
            this._highlightedItemCssClass = value;
            this.raisePropertyChanged('highlightedItemCssClass');
        }
    },
    
    get_delimiterCharacters: function() 
    {
        /// <value type="String">
        /// Gets or sets the character(s) used to seperate words for autocomplete.
        /// </value>
        return this._delimiterCharacters;
    },
    set_delimiterCharacters: function(value) 
    {
        if (this._delimiterCharacters != value) 
        {
            this._delimiterCharacters = value;
            this.raisePropertyChanged('delimiterCharacters');
        }
    },
    
    get_firstRowSelected:function() 
    {
        /// <value type="Boolean" maybeNull="true">
        /// Flag to determine if the first option in the flyout is selected or not. 
        /// </value>
        return this._firstRowSelected;
    },
    set_firstRowSelected:function(value) 
    {
        if(this._firstRowSelected != value) 
        {
            this._firstRowSelected = value;
            this.raisePropertyChanged('firstRowSelected');
        }
    },
    
    add_populating : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the populating event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('populating', handler);
    },
    remove_populating : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the populating event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('populating', handler);
    },
    raisePopulating : function(eventArgs) 
    {
        /// <summary>
        /// Raise the populating event
        /// </summary>
        /// <param name="eventArgs" type="Sys.CancelEventArgs" mayBeNull="false">
        /// Event arguments for the populating event
        /// </param>
        /// <returns />
        /// <remarks>
        /// The populating event can be used to provide custom data to AutoComplete
        /// instead of using a web service.  Just cancel the event (using the
        /// CancelEventArgs) and pass your own data to the _update method.
        /// </remarks>
        
        var handler = this.get_events().getHandler('populating');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    },
    
    add_populated : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the populated event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('populated', handler);
    },
    remove_populated : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the populated event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('populated', handler);
    },
    raisePopulated : function(eventArgs) 
    {
        /// <summary>
        /// Raise the populated event
        /// </summary>
        /// <param name="eventArgs" type="Sys.EventArgs" mayBeNull="false">
        /// Event arguments for the populated event
        /// </param>
        /// <returns />
        
        var handler = this.get_events().getHandler('populated');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    },
    
    add_showing : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the showing event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('showing', handler);
    },
    remove_showing : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the showing event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('showing', handler);
    },
    raiseShowing : function(eventArgs) 
    {
        /// <summary>
        /// Raise the showing event
        /// </summary>
        /// <param name="eventArgs" type="Sys.CancelEventArgs" mayBeNull="false">
        /// Event arguments for the showing event
        /// </param>
        /// <returns />
        
        var handler = this.get_events().getHandler('showing');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    },
    
    add_shown : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the shown event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('shown', handler);
    },
    remove_shown : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the shown event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('shown', handler);
    },
    raiseShown : function(eventArgs) 
    {
        /// <summary>
        /// Raise the shown event
        /// </summary>
        /// <param name="eventArgs" type="Sys.EventArgs" mayBeNull="false">
        /// Event arguments for the shown event
        /// </param>
        /// <returns />
        
        var handler = this.get_events().getHandler('shown');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    },
    
    add_hiding : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the hiding event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('hiding', handler);
    },
    remove_hiding : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the hiding event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('hiding', handler);
    },
    raiseHiding : function(eventArgs) 
    {
        /// <summary>
        /// Raise the hiding event
        /// </summary>
        /// <param name="eventArgs" type="Sys.CancelEventArgs" mayBeNull="false">
        /// Event arguments for the hiding event
        /// </param>
        /// <returns />
        
        var handler = this.get_events().getHandler('hiding');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    },
    
    add_hidden : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the hidden event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('hidden', handler);
    },
    remove_hidden : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the hidden event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('hidden', handler);
    },
    raiseHidden : function(eventArgs) 
    {
        /// <summary>
        /// Raise the hidden event
        /// </summary>
        /// <param name="eventArgs" type="Sys.EventArgs" mayBeNull="false">
        /// Event arguments for the hidden event
        /// </param>
        /// <returns />
        
        var handler = this.get_events().getHandler('hidden');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    },
    
    add_itemSelected : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the itemSelected event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('itemSelected', handler);
    },
    remove_itemSelected : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the itemSelected event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('itemSelected', handler);
    },
    raiseItemSelected : function(eventArgs) 
    {
        /// <summary>
        /// Raise the itemSelected event
        /// </summary>
        /// <param name="eventArgs" type="NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs" mayBeNull="false">
        /// Event arguments for the itemSelected event
        /// </param>
        /// <returns />
        
        var handler = this.get_events().getHandler('itemSelected');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    },
    
    add_itemOver : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the itemOver event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('itemOver', handler);
    },
    remove_itemOver : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the itemOver event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('itemOver', handler);
    },
    raiseItemOver : function(eventArgs) 
    {
        /// <summary>
        /// Raise the itemOver event
        /// </summary>
        /// <param name="eventArgs" type="NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs" mayBeNull="false">
        /// Event arguments for the itemOver event
        /// </param>
        /// <returns />
        
        var handler = this.get_events().getHandler('itemOver');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    },
    
    add_itemOut : function(handler) 
    {
        /// <summary>
        /// Add an event handler for the itemOut event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().addHandler('itemOut', handler);
    },
    remove_itemOut : function(handler) 
    {
        /// <summary>
        /// Remove an event handler from the itemOut event
        /// </summary>
        /// <param name="handler" type="Function" mayBeNull="false">
        /// Event handler
        /// </param>
        /// <returns />
        this.get_events().removeHandler('itemOut', handler);
    },
    raiseItemOut : function(eventArgs) 
    {
        /// <summary>
        /// Raise the itemOut event
        /// </summary>
        /// <param name="eventArgs" type="NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs" mayBeNull="false">
        /// Event arguments for the itemOut event
        /// </param>
        /// <returns />
        
        var handler = this.get_events().getHandler('itemOut');
        if (handler) 
        {
            handler(this, eventArgs);
        }
    }
}
NhsCui.Toolkit.Web.NameInputBoxControl.TitleAutoComplete.registerClass('NhsCui.Toolkit.Web.NameInputBoxControl.TitleAutoComplete', AjaxControlToolkit.BehaviorBase);
NhsCui.Toolkit.Web.NameInputBoxControl.TitleAutoComplete.descriptor = 
{
    properties: [   {name: 'completionInterval', type: Number},
                    {name: 'completionList', isDomElement: true},
                    {name: 'completionListElementID', type: String},
                    {name: 'completionSetCount', type: Number},
                    {name: 'minimumPrefixLength', type: Number},
                    {name: 'serviceMethod', type: String},
                    {name: 'servicePath', type: String},
                    {name: 'enableCaching', type: Boolean} ]
}


NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs = function(item, text) 
{
    /// <summary>
    /// Event arguments used when the itemSelected event is raised
    /// </summary>
    /// <param name="item" type="Sys.UI.DomElement" DomElement="true" mayBeNull="true">
    /// Item
    /// </param>
    /// <param name="text" type="String" mayBeNull="true">
    /// Text of the item
    /// </param>
    NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs.initializeBase(this);
    
    this._item = item;
    this._text = text;
}
NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs.prototype = 
{
    get_item : function() 
    {
        /// <value type="Sys.UI.DomElement" DomElement="true" mayBeNull="true">
        /// Item
        /// </value>
        return this._item;
    },
    set_item : function(value) 
    {
        this._item = value;
    },
    
    get_text : function() 
    {
        /// <value type="String" maybeNull="true">
        /// Text of the item
        /// </value>
        return this._text;
    },
    set_text : function(value) 
    {
        this._text = value;
    }
}
NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs.registerClass('NhsCui.Toolkit.Web.NameInputBoxControl.AutoCompleteItemEventArgs', Sys.EventArgs);