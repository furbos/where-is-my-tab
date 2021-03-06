function WhereIsMyTabPopup()
{
	var mThis = this;
	
	this.mMaxResults = 6;
	this.mSelectedIndex = false;
	
	this.mTabs = [];
	this.mResults = [];
	this.mKeywords = [];
	

	/**
	 * Initialize
	 *
	 * @return void
	 */
	this.initialize = function()
	{
		this.addListeners();
		this.readOpenTabs();
	};
	
	
	/**
	 * Add event listeners
	 *
	 * @return void
	 */
	this.addListeners = function()
	{
		document.addEventListener('DOMContentLoaded', function () 
		{
			$('keywords').addEventListener('keyup', function(aEvent) { mThis.listenerKeywordsKeyUp(aEvent); });
			document.addEventListener('keyup', function(aEvent) { mThis.listenerDocumentKeyUp(aEvent); })
		});
	};
	
	
	/**
	 * Read open tabs
	 *
	 * @return void
	 */
	this.readOpenTabs = function()
	{
		chrome.tabs.query({ },
			function(aTabs) 
			{
				mThis.mTabs = aTabs;
			}
		);
	};
	
	
	/**
	 * Event listener for document key up
	 *
	 * @param aEvent
	 * @return void
	 */
	this.listenerDocumentKeyUp = function(aEvent)
	{
		switch (aEvent.which) {
			case KEY_UP:
				this.selectResult(-1);
				break;
				
			case KEY_DOWN:
				this.selectResult(1);
				break;
				
			case KEY_ENTER:
				if (this.mSelectedIndex !== false) {
					this.goToTab(parseInt($('results').children[this.mSelectedIndex].dataset.tabId));
				}
				break;
		}
	};
	
	
	/**
	 * Event listener for keywords key up
	 *
	 * @param aEvent
	 * @return void
	 */
	this.listenerKeywordsKeyUp = function(aEvent)
	{
		switch (aEvent.which) {
			case KEY_UP:
			case KEY_DOWN:
				break;
				
			default:
				this.mKeywords = uniqueArray($('keywords').value.split(' '));
				this.searchForTab();
				break;
		}
	};
	
	
	/**
	 * Go through results with KEY_UP & KEY_DOWN
	 *
	 * @param aDirection
	 * @return void
	 */
	this.selectResult = function(aDirection)
	{
		if (!this.mResults || this.mResults.length == 0) return;
		
		var lResultsPrinted = Math.min(this.mMaxResults, this.mResults.length);
		var $keywords = $('keywords');

		if ($keywords.isActive()) {
			if (aDirection == -1) {
				this.mSelectedIndex = lResultsPrinted - 1;
			} else {
				this.mSelectedIndex = 0;
			}

			$keywords.blur();
		} else {
			this.mSelectedIndex += aDirection;
			if (this.mSelectedIndex > lResultsPrinted - 1 || this.mSelectedIndex < 0) {
				this.mSelectedIndex = false;
				$keywords.focus();
			}
		}
		
		this.highlightResult();
	};
	
	
	/**
	 * Highlight the result item
	 *
	 * @return void
	 */
	this.highlightResult = function()
	{
		var lResultsPrinted = Math.min(this.mMaxResults, this.mResults.length);
		
		for (var i = 0; i < lResultsPrinted; i++) {
			$('result-' + this.mResults[i].id).removeClass('hilight');
		}
		
		if (this.mSelectedIndex !== false) {
			$('result-' + this.mResults[this.mSelectedIndex].id).addClass('hilight');
		}
	};
	
	
	/**
	 * Perform actual search in all open tabs (in title & url)
	 *
	 * @return void
	 */
	this.searchForTab = function()
	{
		this.mResults = [];

		if (this.mKeywords.length > 0) {
			$('keywords').style.backgroundImage = 'url("media/loading.gif")';

			for (var i = 0; i < this.mTabs.length; i++) {
				this.mTabs[i].keywords = 0;

				for (var j = 0; j < this.mKeywords.length; j++) {
					if (this.mTabs[i].title.toLowerCase().indexOf(this.mKeywords[j].toLowerCase()) != -1 || this.mTabs[i].url.toLowerCase().indexOf(this.mKeywords[j].toLowerCase()) != -1) {
						this.mTabs[i].keywords++;
					}
				}

				if (this.mTabs[i].keywords == this.mKeywords.length) this.mResults.push(this.mTabs[i]);
			}
		}

		this.mResults.sort(function(aItemA, aItemB)
		{
			return aItemB.keywords-aItemA.keywords;
		});

		this.printResults();
	};
	
	
	/**
	 * Print search results
	 *
	 * @return void
	 */
	this.printResults = function() 
	{
		$('results').removeChildren();
		this.mResultIds = [];
		this.mSelectedIndex = 0;
		
		for (var i = 0; i < this.mResults.length && i < this.mMaxResults; i++) {
			this.mResultIds.push(this.mResults[i].id);
			this.printResult(this.mResults[i]);
		}
		
		$('keywords').style.backgroundImage = 'none';
	};
	
	
	/**
	 * Print one row in results
	 *
	 * @param aResult
	 * @return void
	 */
	this.printResult = function(aResult)
	{
		var lLi = document.createElement('li');
		lLi.id = "result-" + aResult.id;
		
		if (aResult.favIconUrl) {
			var lFavIconImg = document.createElement('img');
			lFavIconImg.src = aResult.favIconUrl;
			
			var lFavIcon = document.createElement('div');
			lFavIcon.className = 'icon';
			lFavIcon.appendChild(lFavIconImg);
			
			lLi.appendChild(lFavIcon);
		}
		
		var lTitle = document.createElement('div');
		lTitle.className = 'title';
		lTitle.innerHTML = this.hilightKeywords(aResult.title);
		lLi.appendChild(lTitle);
		
		var lUrl = document.createElement('div');
		lUrl.className = 'url';
		lUrl.innerHTML = this.hilightKeywords(this.cleanUrl(aResult.url));
		lLi.appendChild(lUrl);
		
		lLi.dataset.tabId = aResult.id;
		lLi.addEventListener('click', function() { mThis.goToTab(parseInt(this.dataset.tabId)); });
		
		$('results').appendChild(lLi);
	};
	
	
	/**
	 * Remove protocol and for some cases also trailing slash
	 *
	 * @param aUrl
	 * @return string
	 */
	this.cleanUrl = function(aUrl)
	{
		aUrl = aUrl.replace(/^https?:\/\//, '');

		if (aUrl.split('/').length - 1 == 1) {
			aUrl = aUrl.replace(/\/$/, '');
		}

		return aUrl;
	};
	
	
	/**
	 * Highlight the keywords in the text
	 *
	 * @param aText
	 * @return string
	 */
	this.hilightKeywords = function(aText)
	{
		var lKeywordsEscaped = [];

		for (var i = 0; i < this.mKeywords.length; i++) {
			lKeywordsEscaped[i] = this.mKeywords[i].escapeForRegExp();
		}

		var lRegExp = new RegExp('(' + lKeywordsEscaped.join('|') + ')', 'gi');
		aText = aText.replace(lRegExp, '<span>$1</span>');

		return aText;
	};
	
	
	/**
	 * Go to the selected window & tab
	 *
	 * @param aTabId
	 * @return void
	 */
	this.goToTab = function(aTabId)
	{
		chrome.tabs.get(aTabId, function(aTab)
		{
			chrome.windows.get(aTab.windowId, function(aWindow)
			{
				chrome.windows.update(aWindow.id, { focused: true });

				if (aTab && !aTab.selected) {
					chrome.tabs.update(aTabId, { selected: true });
				}

				window.close();
			});
		});
	};
}


var lWhereIsMyTabPopup = new WhereIsMyTabPopup();
lWhereIsMyTabPopup.initialize();
