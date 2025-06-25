import * as React from "react";
import * as reactDom from "react-dom";
import { connect } from "react-redux";
import marked from 'marked';
import "../css/chatbox.css";
import * as PostFunctions from "./PostFunctions";

class NewTabViewUnconnected extends React.Component {
    constructor(props) {
        super(props);
        this.fileInputRef = React.createRef();
        this.state = {
            messages: [],
            currentInput: '',
            isBotTyping: false,
            lastNodeCreated: null,
            isExpanded: false,
            showAgentMenu: false,
            showModelMenu: false,
            editingMessageIndex: null,
            editingMessageText: '',
            editingMessageSender: null,
            chatWidth: 260,
            isDragging: false,
            isDraggableActive: false,
            showReferencePopup: false,
            currentReference: null,
            abortController: null,
            selectedModel: 'o3-mini',
            showFileViewer: false,
            files: [],
            isLoadingFiles: false
        };
        this.messagesEndRef = React.createRef();
        this.dragButtonRef = React.createRef();
        this.sliderRef = React.createRef();
    }

    handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Show loading message
        const loadingMessage = {
            text: 'Uploading files...',
            sender: 'system'
        };
        this.setState(prevState => ({
            messages: [...prevState.messages, loadingMessage]
        }));

        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('user_id', user_name);
                formData.append('source', file.name);
                formData.append('embedding_model', this.state.selectedModel === 'o3-mini' ? 'text-embedding-3-small' : 'nomic-embed-text');

                const response = await fetch("http://10.55.9.34:5005/upload", {
                    method: "POST",
                    headers: {
                        "accept": "application/json",
                        "x-api-key": "secret"
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Failed to upload ${file.name}`);
                }
            }

            // Show success message
            const successMessage = {
                text: 'Files uploaded successfully!',
                sender: 'system'
            };
            this.setState(prevState => ({
                messages: [...prevState.messages.filter(msg => msg !== loadingMessage), successMessage]
            }), () => {
                setTimeout(() => {
                    this.setState(prevState => ({
                        messages: prevState.messages.filter(msg => msg !== successMessage)
                    }));
                }, 3000);
            });

            // Refresh file list if file viewer is open
            if (this.state.showFileViewer) {
                this.fetchFiles();
            }

        } catch (error) {
            console.error('Error uploading files:', error);
            const errorMessage = {
                text: `Error uploading files: ${error.message}`,
                sender: 'system'
            };
            this.setState(prevState => ({
                messages: [...prevState.messages.filter(msg => msg !== loadingMessage), errorMessage]
            }), () => {
                // Remove error message after 3 seconds
                setTimeout(() => {
                    this.setState(prevState => ({
                        messages: prevState.messages.filter(msg => msg !== errorMessage)
                    }));
                }, 3000);
            });
        }

        // Clear the file input
        e.target.value = '';
    }

    toggleAgentMenu = () => {
        this.setState(s => ({
          showAgentMenu: !s.showAgentMenu,
          showModelMenu: false
        }));
    };
      toggleModelMenu = () => {
        this.setState(s => ({
          showModelMenu: !s.showModelMenu,
          showAgentMenu: false
        }));
    };

    selectModel = (model) => {
        this.setState({
            selectedModel: model,
            showModelMenu: false
        }, () => {
            // Refresh files if file viewer is open
            if (this.state.showFileViewer) {
                this.fetchFiles();
            }
        });
    };

    toggleExpand = () => {
        this.setState(prev => ({ isExpanded: !prev.isExpanded }));
    };

    scrollToBottom = () => {
        this.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    componentDidMount() {
        this.dragButtonRef = React.createRef();
        this.initializeSlider();
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            this.makeDraggable();
        }, 0);
        // Add click outside listener
        document.addEventListener('click', this.handleClickOutside);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.messages.length !== this.state.messages.length) {
            this.scrollToBottom();
        }
    }

    componentWillUnmount() {
        // Clean up the click outside listener
        document.removeEventListener('click', this.handleClickOutside);
    }

    handleClickOutside = (e) => {
        const chatbox = document.getElementById('new-tab-content');
        if (chatbox && !chatbox.contains(e.target) && !this.state.isDragging && !this.state.isDraggableActive) {
            this.setState({ chatWidth: 260 }); // Reset to original size
        }
    }

    handleInputChange = (e) => {
        this.setState({ currentInput: e.target.value });
    }

    handleSendMessage = async () => {
        const { currentInput, selectedModel } = this.state;
        if (!currentInput.trim()) return;
        
        // Create new AbortController for this request
        const abortController = new AbortController();
        this.setState({ abortController });
        
        // Adds User MSG
        const userMessage = { text: currentInput, sender: 'user' };
        this.setState(prevState => ({
            messages: [...prevState.messages, userMessage],
            currentInput: '',
            isBotTyping: true
        }), () => {
            this.scrollToBottom();
        });
    
        // Typing 3 dots
        const typingIndicator = { text: '...', sender: 'bot', isTyping: true };
        this.setState(prevState => ({
            messages: [...prevState.messages, typingIndicator]
        }), () => {
            this.scrollToBottom();
        });
        
        // Fetch AI Response
        try {
            const response = await fetch("http://10.55.9.34:5005/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": "secret"
                },
                body: JSON.stringify({ 
                    prompt: currentInput,
                    model: selectedModel,
                    user_id: user_name,
                }),
                mode: "cors",
                signal: abortController.signal
            });
    
            if (!response.ok) throw new Error('API request failed');
    
            const data = await response.json();
            const botResponse = data.response;
            const context = data.context || [];
            
            console.log('Received context:', context); // Debug log
    
            // Remove typing indicator
            this.setState(prevState => ({
                messages: prevState.messages.filter(msg => !msg.isTyping),
                isBotTyping: true
            }), () => {
                this.scrollToBottom();
            });
    
            // simulate streaming by adding characters one by one
            let displayedText = '';
            const botMessage = { text: displayedText, sender: 'bot', context: context };
            
            console.log('Initial bot message with context:', botMessage); // Debug log
            
            // Add initial empty bot message
            this.setState(prevState => ({
                messages: [...prevState.messages, botMessage]
            }), () => {
                this.scrollToBottom();
            });
    
            // Stream the response
            for (let i = 0; i < botResponse.length; i++) {
                // Check if the request was aborted
                if (abortController.signal.aborted) {
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 20));
                displayedText += botResponse[i];
                
                // Update the last message (which is the bot's message)
                this.setState(prevState => ({
                    messages: [
                        ...prevState.messages.slice(0, -1),
                        { 
                            ...prevState.messages[prevState.messages.length - 1], 
                            text: displayedText,
                            context: context // Preserve context during streaming
                        }
                    ]
                }), () => {
                    this.scrollToBottom();
                });
            }
    
            this.setState({ 
                isBotTyping: false,
                abortController: null 
            }, () => {
                setTimeout(() => {
                    this.makeDraggable();
                }, 100);
            });
    
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request was aborted');
            } else {
                console.error('API Error:', error);
                const errorMessage = { text: 'Sorry, I encountered an error. Please try again.', sender: 'bot' };
                this.setState(prevState => ({
                    messages: [
                        ...prevState.messages.filter(msg => !msg.isTyping),
                        errorMessage
                    ],
                    isBotTyping: false,
                    abortController: null
                }), () => {
                    this.scrollToBottom();
                });
            }
        }
    }
    
    handleKeyPress = (e) => {
        if (e.key === 'Enter' && !this.state.isBotTyping) {
            this.handleSendMessage();
        }
    }

    getLatestBotMessage() {
        let botMessageText = '';
        for (let i = this.state.messages.length - 1; i >= 0; i--) {
            if (this.state.messages[i].sender === 'bot' && !this.state.messages[i].isTyping) {
                botMessageText = this.state.messages[i].text;
                break;
            }
        }
        return botMessageText;
    }

    getWeekAndColumnIds() {
        let weekId = null;
        let columnId = null;

        // Try multiple approaches to find week ID
        const weekWorkflow = $(".week-workflow").first();
        if (weekWorkflow.length) {
            weekId = parseInt(weekWorkflow.attr('id') || weekWorkflow.data('child-id'));
            console.log("Using week from week-workflow:", weekId);
        }

        if (isNaN(weekId) || weekId === null) {
            const week = $(".week").first();
            if (week.length) {
                weekId = parseInt(week.attr('id'));
                console.log("Using week from .week:", weekId);
            }
        }

        if (isNaN(weekId) || weekId === null) {
            const weekBlocks = $(".week-block .week-workflow");
            if (weekBlocks.length > 0) {
                const firstWeekBlock = $(weekBlocks[0]);
                weekId = parseInt(firstWeekBlock.attr('id') || firstWeekBlock.data('child-id'));
                console.log("Using week from week-block:", weekId);
            }
        }

        // Try to find column ID
        const columnWorkflow = $(".column-workflow").first();
        if (columnWorkflow.length) {
            columnId = parseInt(columnWorkflow.attr('id') || columnWorkflow.data('child-id'));
            console.log("Using column from column-workflow:", columnId);
        }

        if (isNaN(columnId) || columnId === null) {
            const column = $(".column").first();
            if (column.length) {
                columnId = parseInt(column.attr('id'));
                console.log("Using column from .column:", columnId);
            }
        }

        return { weekId, columnId };
    }

    createNode(weekId, position, columnId, botMessageText) {
        PostFunctions.newNode(
            weekId,
            position,
            columnId,
            null,  // column_type (use default)
            'Response',  // title
            botMessageText,  // description
            (data) => {
                console.log("Node created:", data);
                if (data && data.new_model && data.new_model.id) {
                    const nodeId = data.new_model.id;
                    const feedback = {
                        text: 'Node successfully added to workflow!',
                        sender: 'system'
                    };
                    this.setState(prevState => ({
                        messages: [...prevState.messages, feedback],
                        lastNodeCreated: nodeId
                    }), () => {
                        this.scrollToBottom();
                        setTimeout(() => {
                            this.setState(prevState => ({
                                messages: prevState.messages.filter(msg => msg !== feedback)
                            }));
                        }, 3000);
                    });
                }
            }
        );
    }

    createNodeDirectly = () => {
        const botMessageText = this.getLatestBotMessage();
        const { weekId, columnId } = this.getWeekAndColumnIds();
        
        if (isNaN(weekId) || weekId === null) {
            console.error("Could not find a valid week ID - aborting node creation");
            alert("Failed to find a valid week to add the node to.");
            return;
        }
        
        const position = $(`.week[id='${weekId}'] .node-week`).length || 0;
        console.log(`Creating node: weekId=${weekId}, position=${position}, columnId=${columnId}`);
        
        //this.createNode(weekId, position, columnId, botMessageText);
    }

    makeDraggable = () => {
        const { weekId, columnId } = this.getWeekAndColumnIds();
        if (!weekId) return;

        // Make the main drag button draggable
        const $element = $(this.dragButtonRef.current);
        if (!$element.length) return;

        // Store the data directly on the element as expected by the codebase
        $element[0].dataDraggable = {
            column: columnId,
            column_type: null
        };

        $element.draggable({
            helper: (e, item) => {
                const helper = $(document.createElement('div'));
                helper.addClass("node-ghost");
                helper.appendTo(document.body);
                return helper;
            },
            cursor: "move",
            cursorAt: { top: 20, left: 100 },
            distance: 10,
            start: (e, ui) => {
                this.setState({ isDraggableActive: true });
                $(".workflow-canvas").addClass("dragging-nodeweek");
                $(".node-week").addClass("dragging");
            },
            stop: (e, ui) => {
                setTimeout(() => {
                    this.setState({ isDraggableActive: false });
                }, 100);
                $(".workflow-canvas").removeClass("dragging-nodeweek");
                $(".node-week").removeClass("dragging");
                // Call createNodeDirectly when drag is completed
                this.createNodeDirectly();
            }
        });

        // Make list items draggable
        $('.markdown-message li').each((index, element) => {
            const $li = $(element);
            if ($li.hasClass('ui-draggable')) return;

            // Store the list item text as description
            const listItemText = $li.text().trim();
            
            $li[0].dataDraggable = {
                column: columnId,
                column_type: null,
                description: listItemText
            };

            $li.draggable({
                helper: (e, item) => {
                    const helper = $(document.createElement('div'));
                    helper.addClass("node-ghost");
                    helper.appendTo(document.body);
                    return helper;
                },
                cursor: "move",
                cursorAt: { top: 20, left: 100 },
                distance: 10,
                start: (e, ui) => {
                    this.setState({ isDraggableActive: true });
                    $(".workflow-canvas").addClass("dragging-nodeweek");
                    $(".node-week").addClass("dragging");
                },
                stop: (e, ui) => {
                    setTimeout(() => {
                        this.setState({ isDraggableActive: false });
                    }, 100);
                    $(".workflow-canvas").removeClass("dragging-nodeweek");
                    $(".node-week").removeClass("dragging");
                    // Get the week and column IDs from the drop target
                    const dropTarget = ui.helper.data('ui-droppable');
                    if (dropTarget) {
                        const weekId = parseInt(dropTarget.element.parent().attr("id"));
                        const columnId = parseInt(dropTarget.element.attr("data-column-id"));
                        const new_index = dropTarget.element.prevAll().length + 1;
                        this.createNode(weekId, new_index, columnId, listItemText);
                    }
                }
            });
        });

        // Make the droppable areas accept our custom drag
        $(".node-week").droppable({
            tolerance: "pointer",
            over: (e, ui) => {
                const drop_item = $(e.target);
                const drag_item = ui.draggable;
                const drag_helper = ui.helper;
                drag_helper.addClass("valid-drop");
                drop_item.addClass("new-node-drop-over");
            },
            out: (e, ui) => {
                const drag_item = ui.draggable;
                const drag_helper = ui.helper;
                const drop_item = $(e.target);
                drag_helper.removeClass("valid-drop");
                drop_item.removeClass("new-node-drop-over");
            },
            drop: (e, ui) => {
                $(".new-node-drop-over").removeClass("new-node-drop-over");
                const drop_item = $(e.target);
                const drag_item = ui.draggable;
                const new_index = drop_item.prevAll().length + 1;
                const weekId = parseInt(drop_item.parent().attr("id"));
                const columnId = parseInt(drop_item.attr("data-column-id"));
                
                // Get the description from the dragged items data
                let description;
                if (drag_item.hasClass('chat-node-draggable')) {
                    // If it's the main green button, use the full bot msg
                    description = this.getLatestBotMessage();
                } else {
                    // If it's a list item, use its text content
                    description = drag_item[0].dataDraggable.description;
                }
                
                // Create the node with the appropriate description
                this.createNode(weekId, new_index, columnId, description);
            }
        });
    }

    handleCopyMessage = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            const feedback = {
                text: 'Copied to clipboard!',
                sender: 'system'
            };
            this.setState(prevState => ({
                messages: [...prevState.messages, feedback]
            }), () => {
                this.scrollToBottom();
                setTimeout(() => {
                    this.setState(prevState => ({
                        messages: prevState.messages.filter(msg => msg !== feedback)
                    }));
                }, 2000);
            });
        });
    }

    handleDoubleClick = (index, text, sender) => {
        this.setState({
            editingMessageIndex: index,
            editingMessageText: text,
            editingMessageSender: sender
        });
    }

    handleEditChange = (e) => {
        this.setState({ editingMessageText: e.target.value });
    }

    handleEditKeyPress = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            // save on Ctrl+Enter
            this.handleEditSave();
        } else if (e.key === 'Escape') {
            this.handleEditCancel();
        }
        // default behavior handle new lines
    }

    handleEditSave = () => {
        const { editingMessageIndex, editingMessageText, editingMessageSender } = this.state;
        if (editingMessageText.trim()) {
            const parsedMarkdown = editingMessageSender === 'bot' ? marked.parse(editingMessageText) : undefined;
            
            this.setState(prevState => ({
                messages: prevState.messages.map((msg, idx) => 
                    idx === editingMessageIndex ? { 
                        ...msg, 
                        text: editingMessageText,
                        parsedMarkdown: parsedMarkdown
                    } : msg
                ),
                editingMessageIndex: null,
                editingMessageText: '',
                editingMessageSender: null
            }), () => {
                // After saving, reinitialize draggables for any new list items
                if (editingMessageSender === 'bot') {
                    setTimeout(() => {
                        this.makeDraggable();
                    }, 100);
                }
            });
        }
    }

    handleEditCancel = () => {
        this.setState({
            editingMessageIndex: null,
            editingMessageText: '',
            editingMessageSender: null
        });
    }

    initializeSlider = () => {
        const slider = this.sliderRef.current;
        if (!slider) return;

        let startX;
        let startWidth;

        const onMouseDown = (e) => {
            this.setState({ isDragging: true });
            startX = e.clientX;
            startWidth = this.state.chatWidth;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
            e.stopPropagation();
        };

        const onMouseMove = (e) => {
            if (!this.state.isDragging) return;
            const deltaX = startX - e.clientX;
            const newWidth = Math.max(260, Math.min(600, startWidth + deltaX));
            this.setState({ chatWidth: newWidth });
        };

        const onMouseUp = (e) => {
            // Add a small delay before setting isDragging to false
            // This prevents the click outside handler from triggering immediately
            setTimeout(() => {
                this.setState({ isDragging: false });
            }, 100);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            e.stopPropagation();
        };

        slider.addEventListener('mousedown', onMouseDown);
    }

    handleReferenceClick = (reference) => {
        this.setState({
            showReferencePopup: true,
            currentReference: reference
        });
    }

    closeReferencePopup = () => {
        this.setState({
            showReferencePopup: false,
            currentReference: null
        });
    }

    handleStopResponse = () => {
        if (this.state.abortController) {
            this.state.abortController.abort();
            this.setState({ 
                isBotTyping: false,
                abortController: null
            });
        }
    }

    toggleFileViewer = () => {
        this.setState(prevState => {
            const newShowFileViewer = !prevState.showFileViewer;
            if (newShowFileViewer) {
                this.fetchFiles();
            }
            return { showFileViewer: newShowFileViewer };
        });
    }

    fetchFiles = async () => {
        this.setState({ isLoadingFiles: true });
        try {
            const collection = this.state.selectedModel === 'o3-mini' ? 'openaiusers' : 'ollamausers';
            const response = await fetch(`http://10.55.9.34:5005/files?user_id=${user_name}&collection=${collection}`, {
                method: "GET",
                headers: {
                    "accept": "application/json",
                    "x-api-key": "secret"
                }
            });

            if (!response.ok) throw new Error('Failed to fetch files');
            
            const data = await response.json();
            this.setState({ files: data });
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            this.setState({ isLoadingFiles: false });
        }
    }

    handleDeleteFile = async (source) => {
        try {
            const collection = this.state.selectedModel === 'o3-mini' ? 'openaiusers' : 'ollamausers';
            const response = await fetch(`http://10.55.9.34:5005/delete?collection_name=${collection}&user_id=${user_name}&source=${encodeURIComponent(source)}`, {
                method: "DELETE",
                headers: {
                    "accept": "application/json",
                    "x-api-key": "secret"
                }
            });

            if (!response.ok) throw new Error('Failed to delete file');
            
            // Show success message
            const successMessage = {
                text: 'File deleted successfully!',
                sender: 'system'
            };
            this.setState(prevState => ({
                messages: [...prevState.messages, successMessage]
            }), () => {
                // Remove success message after 3 seconds
                setTimeout(() => {
                    this.setState(prevState => ({
                        messages: prevState.messages.filter(msg => msg !== successMessage)
                    }));
                }, 3000);
            });

            // Refresh the file list
            this.fetchFiles();
        } catch (error) {
            console.error('Error deleting file:', error);
            const errorMessage = {
                text: `Error deleting file: ${error.message}`,
                sender: 'system'
            };
            this.setState(prevState => ({
                messages: [...prevState.messages, errorMessage]
            }), () => {
                // Remove error message after 3 seconds
                setTimeout(() => {
                    this.setState(prevState => ({
                        messages: prevState.messages.filter(msg => msg !== errorMessage)
                    }));
                }, 3000);
            });
        }
    }

    render() {
        return reactDom.createPortal(
            <div id="new-tab-content" className="right-panel-inner" style={{
                display: 'flex',
                flexDirection: 'column',
                margin: 0,
                padding: '10px',
                boxSizing: 'border-box',
                height: '100%',
                width: `${this.state.chatWidth}px`,
                position: 'absolute',
                right: 0,
                backgroundColor: 'white',
                overflow: 'visible'
            }}>
                <div className="resize-slider" ref={this.sliderRef} style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    cursor: 'ew-resize',
                    backgroundColor: '#E9EBF2',
                    transition: 'background-color 0.2s'
                }} />
                <h3>{gettext("Intelligent Support")}</h3>
                <h5>{gettext("Ask Anything")}</h5>
                <hr />
                <div className="new-tab-content" style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'visible'
                }}>
                    <h4>{gettext("Chat")}</h4>
                    {/* Chat Container */}
                    <div className="chat-container" style={{
                        border: '2px solid black',
                        borderRadius: '12px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100vh - 250px)',
                        position: 'relative',
                        background: 'white',
                        overflow: 'hidden'
                    }}>
                        {/* Messages Container */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            paddingRight: '4px',
                            marginBottom: '10px',
                            minHeight: 0,
                            position: 'relative',
                            isolation: 'isolate'
                        }}>
                            {/* File Viewer Overlay */}
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'white',
                                transform: this.state.showFileViewer ? 'translateX(0)' : 'translateX(100%)',
                                transition: 'transform 0.3s ease-in-out',
                                zIndex: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '20px',
                                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                                height: '100%',
                                overflow: 'hidden',
                                pointerEvents: this.state.showFileViewer ? 'auto' : 'none'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '20px',
                                    flexShrink: 0
                                }}>
                                    <h3 style={{ margin: 0, flex:'4' }}>Files</h3>
                                    <button
                                        onClick={this.toggleFileViewer}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            fontSize: '24px',
                                            cursor: 'pointer',
                                            padding: '5px',
                                            flex: '1'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    paddingRight: '10px'
                                }}>
                                    {this.state.isLoadingFiles ? (
                                        <div style={{ textAlign: 'center', padding: '20px' }}>
                                            Loading files...
                                        </div>
                                    ) : this.state.files.length === 0 ? (
                                        <p>No files uploaded yet.</p>
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                        }}>
                                            {this.state.files.map((file, index) => (
                                                <div key={index} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '10px',
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: '5px',
                                                    border: '1px solid #ddd',
                                                    flexDirection: 'row'
                                                }}>
                                                    <div style={{
                                                        flex:4
                                                    }}>
                                                        <h5>{file.source}</h5>
                                                    </div>
                                                    <button
                                                        onClick={() => this.handleDeleteFile(file.source)}
                                                        style={{
                                                            border: 'none',
                                                            background: 'none',
                                                            color: '#ff4444',
                                                            cursor: 'pointer',
                                                            padding: '5px',
                                                            fontSize: '16px',
                                                            marginLeft: '10px',
                                                            flex: 1
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Existing messages content */}
                            {this.state.messages.map((msg, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    alignSelf: msg.sender === 'user' ? 'flex-end' :
                                              msg.sender === 'system' ? 'center' : 'flex-start',
                                    position: 'relative',
                                    zIndex: 1
                                }}>
                                    {msg.sender === 'user' && !msg.isTyping && (
                                        <button
                                            onClick={() => this.handleCopyMessage(msg.text)}
                                            className="copy-btn"
                                            style={{
                                                border: 'none',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                opacity: 0.7,
                                                transition: 'opacity 0.2s',
                                                marginTop: '10px',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                                        >
                                        </button>
                                    )}
                                    <div 
                                        style={{
                                            backgroundColor: msg.sender === 'user' ? '#00C389' :
                                                            msg.sender === 'system' ? '#5b5b5b' : 'black',
                                            color: 'white',
                                            padding: '10px 15px',
                                            borderRadius: '20px',
                                            maxWidth: msg.sender === 'system' ? '90%' : '70%',
                                            wordBreak: 'break-word',
                                            fontStyle: msg.isTyping ? 'italic' : 'normal',
                                            cursor: (msg.sender === 'user' || msg.sender === 'bot') ? 'pointer' : 'default'
                                        }}
                                        onDoubleClick={() => (msg.sender === 'user' || msg.sender === 'bot') && 
                                            this.handleDoubleClick(index, msg.text, msg.sender)}
                                    >
                                        {this.state.editingMessageIndex === index ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <textarea
                                                    value={this.state.editingMessageText}
                                                    onChange={this.handleEditChange}
                                                    onKeyDown={this.handleEditKeyPress}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #ccc',
                                                        backgroundColor: 'white',
                                                        color: 'black',
                                                        minHeight: '100px',
                                                        resize: 'vertical',
                                                        fontFamily: 'monospace'
                                                    }}
                                                    autoFocus
                                                />
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={this.handleEditSave}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            border: 'none',
                                                            backgroundColor: '#00C389',
                                                            color: 'white',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={this.handleEditCancel}
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            border: 'none',
                                                            backgroundColor: '#ccc',
                                                            color: 'white',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : msg.isTyping ? (
                                            <div className="loader"></div>
                                        ) : msg.sender === 'bot' ? (
                                            <>
                                                <div 
                                                    dangerouslySetInnerHTML={{ __html: msg.parsedMarkdown || marked.parse(msg.text) }} 
                                                    className="markdown-message"
                                                />
                                                {msg.context && msg.context.length > 0 && (
                                                    <div className="reference-circles">
                                                        {msg.context.map((ref, idx) => (
                                                            <div key={idx} className="reference-circle" onClick={() => this.handleReferenceClick(ref)}>
                                                                {idx + 1}
                                                                <div className="reference-popup">
                                                                    <div className="reference-popup-title">
                                                                        {ref.source}
                                                                    </div>
                                                                    <div className="reference-popup-content">
                                                                        {ref.text}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {this.state.showReferencePopup && this.state.currentReference && (
                                                    <div className="reference-modal-overlay" onClick={this.closeReferencePopup}>
                                                        <div className="reference-modal" onClick={e => e.stopPropagation()}>
                                                            <button className="reference-modal-close" onClick={this.closeReferencePopup}>×</button>
                                                            <div className="reference-modal-title">
                                                                {this.state.currentReference.source}
                                                            </div>
                                                            <div className="reference-modal-content">
                                                                {this.state.currentReference.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ marginTop: '10px' }}>
                                                    <div
                                                        ref={this.dragButtonRef}
                                                        className="chat-node-draggable"
                                                        style={{
                                                            backgroundColor: '#04ba74',
                                                            color: 'white',
                                                            borderRadius: '5px',
                                                            border: 'none',
                                                            cursor: 'move',
                                                            fontSize: '14px',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        {gettext("Drag to Add to Workflow")}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                    {msg.sender === 'bot' && !msg.isTyping && (
                                        <button
                                            onClick={() => this.handleCopyMessage(msg.text)}
                                            className="copy-btn"
                                            style={{
                                                border: 'none',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                opacity: 0.7,
                                                transition: 'opacity 0.2s',
                                                marginTop: '10px',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                                        >
                                        </button>
                                    )}
                                </div>
                            ))}
                            <div ref={this.messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div>
                            {/* Option Tab */}
                            {this.state.isExpanded && (
                                <div className="dropup-toolbar">
                                    <div className="pill" onClick={this.toggleAgentMenu}>
                                    ∞ Agent <span className="caret">⌄</span>
                                    {this.state.showAgentMenu && (
                                        <ul className="dropup-menu">
                                        <li>Chat <span className="checkmark">✓</span></li>
                                        <li>Edit/Build</li>
                                        </ul>
                                    )}
                                    </div>

                                    <div className="pill" onClick={this.toggleModelMenu}>
                                    {this.state.selectedModel} <span className="caret">⌄</span>
                                    {this.state.showModelMenu && (
                                        <ul className="dropup-menu">
                                        <li onClick={() => this.selectModel('qwen')}>
                                            qwen {this.state.selectedModel === 'qwen' && <span className="checkmark">✓</span>}
                                        </li>
                                        <li onClick={() => this.selectModel('o3-mini')}>
                                            o3-mini {this.state.selectedModel === 'o3-mini' && <span className="checkmark">✓</span>}
                                        </li>
                                        </ul>
                                    )}
                                    </div>
                                    <div className="icon-group">
                                        {/* trigger hidden file input when clicked */}
                                         <button
                                           className="icon-btn upload-btn"
                                           title="Upload Files"
                                           onClick={() => this.fileInputRef.current.click()}
                                        />
                                        <button 
                                            className="icon-btn view-files-btn" 
                                            title="View Files"
                                            onClick={this.toggleFileViewer}
                                        />
                                    </div>
                                </div>
                            )}
                            {/* Input with +/- button */}
                            <div style={{ display: 'flex', flexDirection: 'row'}}>
                                <div style={{ position: 'relative', flex: 1, marginRight: '10px' }}>
                                    {/* hidden file input */}
                                    <input
                                      type="file"
                                      multiple
                                      style={{ display: 'none' }}
                                      ref={this.fileInputRef}
                                      onChange={this.handleFileUpload}
                                    />                                  
                                    <input
                                        type="text"
                                        placeholder="Message Bot"
                                        value={this.state.currentInput}
                                        onChange={this.handleInputChange}
                                        onKeyPress={this.handleKeyPress}
                                        disabled={this.state.isBotTyping}
                                        style={{
                                            width: '100%',
                                            padding: '10px 40px 10px 10px',
                                            borderRadius: '20px',
                                            border: '1px solid #ccc',
                                            opacity: this.state.isBotTyping ? 0.7 : 1
                                        }}
                                    />
                                    <button
                                        onClick={this.toggleExpand}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '24px',
                                            height: '24px',
                                            fontSize: '16px',
                                            fontWeight: 'bold',
                                            color: 'white',
                                            backgroundColor: this.state.isExpanded ? '#00C389' : '#aaa',
                                            cursor: 'pointer',
                                            padding: 0,
                                            lineHeight: 1,
                                            textAlign: 'center'
                                        }}
                                    >
                                        {this.state.isExpanded ? '-' : '+'}
                                    </button>
                                </div>
    
                                <button
                                    onClick={this.state.isBotTyping ? this.handleStopResponse : this.handleSendMessage}
                                    disabled={!this.state.isBotTyping && !this.state.currentInput.trim()}
                                    className={this.state.isBotTyping ? 'stop-btn' : ''}
                                    style={{
                                        backgroundColor: this.state.isBotTyping ? '#ff4444' : 
                                                       !this.state.currentInput.trim() ? '#ccc' : '#00C389',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: this.state.isBotTyping ? 'pointer' : 
                                               !this.state.currentInput.trim() ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {this.state.isBotTyping ? '' : '↑'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>,
            $("#new-tab")[0]
        );
    }
}    

export const NewTabView = connect(
    null,
    null
)(NewTabViewUnconnected);