## CourseFlow
CourseFlow is a free, cloud-based tool that helps educators visually design curricula and teaching plans. Users can organise lessons, courses, or entire programs using customisation templates, making planning easier at three levels:
[Intro to CourseFlow](https://www.saltise.ca/wp-content/uploads/2023/12/Getting-Started_CourseFlow_primer.pptx.pdf)

**Project**

	- Functions as a root folder
	- Necessary to create it first to start a workflow.
	- Stores all kind of workflows (Course, Activity, and/or Program)
	- If workflows are linked, save them in the same project. 
	- A project can also hold unrelated workflows.
[Learn More](https://www.saltise.ca/wp-content/uploads/2023/12/Folder_Project_tutorial_100-guide.pptx.pdf)

**Workflows**
- Activity (single activity/lesson)
	
        - Let instructors plan day-to-day lessons or projects (CourseFlow's most detailed level).
	![alt text](<./images/Pasted image 20250408113633.png>)
	- **A**: **Category** classifies the curricular decision types. By default, the categories in the image are already setup upon creation. It is recommended that these should be organised/selected before adding nodes.
	- **B**: **Nodes** are small text boxes that describe a task. Drag them from the category stack onto your workflow (their position depends on the category you pick).
	- **C**: **Section** (the grey background): to define a unit of time (or segment of an activity). NOTE: the default setting defines a section as a “part”
	- **D**: **Links** (arrows) between nodes appear automatically, but can removed.
	
    [Learn More](https://www.saltise.ca/wp-content/uploads/2023/12/Workflow_Activity_tutorial_102_guide.pptx.pdf)
- Course (full class)
	    
        - The Course workflow is CourseFlow's mid-level planning tool, helping instructors create interactive course outlines. It can include learning objectives and link to activity workflows, improving organisation and clarity for both teachers and students.
	![alt text](<./images/Pasted image 20250408115807.png>)
	- A: Category
	- B: Node
	- C: Section
	
    [Learn More](https://www.saltise.ca/wp-content/uploads/2023/12/Workflow_Course_tutorial_101_guide.pptx.pdf)
- Program (entire degree/certificate)
	    
        - Could store many courses.
	
    [Example](https://mydalite.org/en/course-flow/workflow/public/5319/)

## Source Code Analysis

#### Server-Side (Django Backend):
- Core Application Files:

    - `course_flow/models.py` - Database models and schema
    - `course_flow/views.py` - Backend API endpoints and view logic
    - `course_flow/urls.py` - URL routing configuration
    - `course_flow/serializers.py` - Data serialization for API responses
    - `course_flow/settings.py` - Application configuration

- Business Logic:

    - `course_flow/tasks.py` - Celery tasks for async operations
    - `course_flow/utils.py` - Utility functions
    - `course_flow/export_functions.py` - Export functionality
    - `course_flow/import_functions.py` - Import functionality
    - `course_flow/analytics.py` - Analytics related functions

- Authentication & Security:
    - `course_flow/decorators.py` - Security decorators and permissions
    - `course_flow/lti.py` - LTI integration

#### Client-Side (Frontend):
- Frontend Framework:
    - Uses Preact/React (as seen in package.json)
    - Redux for state management (@reduxjs/toolkit, redux, preact-redux)
- Build System:
    - Rollup.js for bundling (rollup.config.js)
    - Gulp for task automation (gulpfile.js)
    - Babel for JavaScript transpilation
- UI Components:
    - Preact Material Components for UI elements
    - jQuery for DOM manipulation
    - Flatpickr for date picking
- State Management:
    - `course_flow/redux_actions.py` - Redux action definitions
    Redux store configuration (likely in the static files)
- API Communication:
    - Django REST framework (based on serializers.py)
    - WebSocket support (consumers.py)
Static Files:
    - Static assets are served from course_flow/static/
    - Templates are in course_flow/templates/
Real-time Features:
    - ASGI support (asgi.py)
    - WebSocket consumers (consumers.py)

**Commands**

The following command has a seeding script for activities.
`CourseFlow/course_flow/management/commands/create_saltise_strategies.py`